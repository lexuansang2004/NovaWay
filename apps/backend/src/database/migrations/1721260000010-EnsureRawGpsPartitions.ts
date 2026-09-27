import { MigrationInterface, QueryRunner } from 'typeorm';

// Hotfix — docs/REVIEW_NOTES.md §17. The original migration
// (1721260000006-CreateRawGpsEventsTable.ts) created exactly one static
// partition, raw_gps_events_2026_07 ('2026-07-01' -> '2026-08-01'). The
// "raw_gps_cleanup" job that was supposed to roll partitions forward
// (docs/DATA_MODEL.md §4) was never implemented anywhere in this codebase —
// confirmed by grep, not assumption. Consequence, confirmed both in a real
// CI run (PR #73, job 97358919768, 2026-08-24) and locally: every GPS insert
// with received_at on/after 2026-08-01 fails with
// "no partition of relation raw_gps_events found for row".
//
// This migration does NOT touch 1721260000006 (it may already be applied in
// real environments) and does NOT implement the DROP/cleanup half of
// "raw_gps_cleanup" — only partition *availability* (create current + next
// UTC month if missing). Cleanup/TTL drop remains separately tracked
// (docs/DATA_MODEL.md §4 correction note).
export class EnsureRawGpsPartitions1721260000010 implements MigrationInterface {
  name = 'EnsureRawGpsPartitions1721260000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent + concurrency-safe (pg_advisory_xact_lock serializes callers
    // — this function, the app's PartitionMaintenanceService, and this very
    // migration all funnel through the same lock key). Uses database time
    // (now() AT TIME ZONE 'UTC'), not the calling process's clock, unless a
    // reference_date is explicitly supplied — that parameter exists purely
    // so tests can exercise month-boundary behaviour deterministically
    // without waiting for a real month to roll over.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ensure_raw_gps_partitions(reference_date date DEFAULT NULL)
      RETURNS void AS $$
      DECLARE
        ref_date       date := COALESCE(reference_date, (now() AT TIME ZONE 'UTC')::date);
        month_start    date;
        month_end      date;
        lower_bound    timestamptz;
        upper_bound    timestamptz;
        partition_name text;
        i int;
      BEGIN
        -- Fixed lock key (hashtextextended of a constant string) — every
        -- caller (migration, service bootstrap, periodic re-check, tests
        -- running concurrently) contends on this same key, so overlapping
        -- CREATE TABLE ... PARTITION OF attempts never race each other.
        PERFORM pg_advisory_xact_lock(hashtextextended('novaway_raw_gps_partition_maintenance', 0));

        -- i = 0 -> current UTC month, i = 1 -> next UTC month.
        FOR i IN 0..1 LOOP
          month_start := (date_trunc('month', ref_date) + (i || ' months')::interval)::date;
          month_end := (month_start + interval '1 month')::date;
          partition_name := 'raw_gps_events_' || to_char(month_start, 'YYYY_MM');

          -- Explicit UTC anchor. Casting a bare date straight to timestamptz
          -- (or passing it as a %L literal for one) resolves midnight
          -- through the session's TimeZone GUC, not UTC — on a non-UTC
          -- session (a real risk: nothing in this app pins the connection's
          -- TimeZone) that silently shifts partition boundaries by the
          -- session's offset. Appending the explicit +00 before the
          -- timestamptz cast makes the instant unambiguous regardless of
          -- session TimeZone.
          lower_bound := (month_start::text || ' 00:00:00+00')::timestamptz;
          upper_bound := (month_end::text || ' 00:00:00+00')::timestamptz;

          EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF raw_gps_events FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            lower_bound,
            upper_bound
          );
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Backfill immediately so environments that already applied
    // 1721260000006 (and have been silently failing every GPS insert since
    // 2026-08-01) start accepting traffic again as soon as this migration
    // runs — not only for brand-new deployments.
    await queryRunner.query(`SELECT ensure_raw_gps_partitions();`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally does NOT drop the partitions this function created —
    // by the time a rollback runs, they may hold real inserted GPS rows, and
    // dropping a partition drops its data. Only the function itself (pure
    // DDL-management logic, no data) is removed.
    await queryRunner.query(`DROP FUNCTION IF EXISTS ensure_raw_gps_partitions(date);`);
  }
}
