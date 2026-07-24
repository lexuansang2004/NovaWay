import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  // NFR-API-01 / OPEN_ITEMS_AFTER_MVP.md §5 — brute-force guard, keyed by
  // ThrottlerGuard's default IP tracker. Uses AppModule's ThrottlerModule
  // 'default' throttler (5 attempts/min) — not applied globally, only here.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.id);
  }
}
