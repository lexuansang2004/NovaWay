import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // docs/API_CONTRACT.md §0 — Base URL /api, except GET /, GET /health, and
  // GET /metrics (ops endpoints, not part of the client-facing API surface).
  app.setGlobalPrefix('api', { exclude: ['/', 'health', 'metrics'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: configService.get<string>('WEB_ORIGIN'), credentials: true });
  // Required for @WebSocketGateway (docs/API_CONTRACT.md §6 /realtime namespace)
  // to actually serve socket.io — @nestjs/platform-socket.io being installed is
  // not enough on its own, the adapter must be attached explicitly.
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(configService.get<number>('PORT', 3000));
}
bootstrap();
