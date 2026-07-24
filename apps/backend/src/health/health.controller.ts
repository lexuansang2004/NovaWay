import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  database: { status: 'ok' | 'error' };
  commit_sha: string;
}

// NFR-OBS-01 — checks Postgres connectivity too: most realtime/location
// issues trace back to a DB problem, so a health check that only reports
// "the Node process is alive" isn't useful enough to debug with.
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    return {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database,
      // R3-3 (docs/roadmap/SPRINT_R3_VERIFICATION_CD_HARDENING.md) — Railway
      // auto-injects RAILWAY_GIT_COMMIT_SHA per deployment (not in
      // env.validation.ts: it's platform-provided, not app config, and Nest's
      // ConfigModule allows unknown env vars through by default). Exposed
      // here so the scheduled e2e-staging.yml job can detect a stale deploy
      // by comparing this against develop's HEAD — the same class of "green
      // CI, stale reality" incident found live during R2-7/Vercel drift.
      commit_sha: this.configService.get<string>('RAILWAY_GIT_COMMIT_SHA', 'unknown'),
    };
  }

  private async checkDatabase(): Promise<{ status: 'ok' | 'error' }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }
}
