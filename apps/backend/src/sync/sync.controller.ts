import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncService } from './sync.service';
import { SyncEventsDto } from './dto/sync-events.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

// docs/API_CONTRACT.md §7.
@Controller('trips')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // R2-2 / OPEN_ITEMS_AFTER_MVP.md §5 — initial conservative limit (20
  // batches/min/IP), pending a real load benchmark, same posture as R1-4's
  // login/GPS-event limits. Higher than login's 5/min since legitimate use
  // (device reconnects, flushes a stored batch) can reasonably happen more
  // than once a minute, unlike a login attempt.
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sync(@Req() req: AuthenticatedRequest, @Body() dto: SyncEventsDto) {
    return this.syncService.syncEvents(req.user.id, dto);
  }
}
