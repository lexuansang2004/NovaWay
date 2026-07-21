import { Injectable } from '@nestjs/common';

interface MetricDef {
  name: string;
  help: string;
  type: 'counter' | 'gauge';
}

// NFR-OBS-01 — "metrics cơ bản" for MVP, deliberately not a full
// Prometheus client library (TDR-004: don't over-engineer infra before
// there's real load to justify it). In-memory only — resets on restart,
// which is fine for local debugging; not meant to survive across
// instances/scale (see docs/OBSERVABILITY.md).
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly defs: MetricDef[] = [
    { name: 'http_requests_total', help: 'Total number of HTTP requests', type: 'counter' },
    { name: 'gps_events_processed_total', help: 'Total GPS events accepted and persisted', type: 'counter' },
    { name: 'gps_events_rejected_total', help: 'Total GPS events rejected (validation/ownership/state)', type: 'counter' },
    { name: 'mismatch_warnings_total', help: 'Total vehicle mismatch warnings created', type: 'counter' },
    { name: 'ws_connections_current', help: 'Current authenticated /realtime socket connections', type: 'gauge' },
  ];

  increment(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  gaugeSet(name: string, labels: Record<string, string> = {}, value: number): void {
    this.counters.set(this.key(name, labels), value);
  }

  gaugeIncrement(name: string, labels: Record<string, string> = {}, delta: number): void {
    const key = this.key(name, labels);
    this.counters.set(key, Math.max(0, (this.counters.get(key) ?? 0) + delta));
  }

  // Prometheus text exposition format (https://prometheus.io/docs/instrumenting/exposition_formats/).
  render(): string {
    const lines: string[] = [];
    for (const def of this.defs) {
      lines.push(`# HELP ${def.name} ${def.help}`);
      lines.push(`# TYPE ${def.name} ${def.type}`);
      const entries = [...this.counters.entries()].filter(([key]) => key.startsWith(`${def.name}{`) || key === def.name);
      if (entries.length === 0) {
        lines.push(`${def.name} 0`);
        continue;
      }
      for (const [key, value] of entries) {
        lines.push(`${key} ${value}`);
      }
    }
    return lines.join('\n') + '\n';
  }

  private key(name: string, labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return name;
    const labelStr = entries.map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
  }
}
