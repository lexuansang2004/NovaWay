import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  database: { status: 'ok' | 'error' };
}

// NFR-OBS-01 — checks Postgres connectivity too: most realtime/location
// issues trace back to a DB problem, so a health check that only reports
// "the Node process is alive" isn't useful enough to debug with.
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const database = await this.checkDatabase();
    return {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database,
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
