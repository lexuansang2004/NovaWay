import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Express's default JSON body limit is 100kb — too small for
  // POST /api/trips/sync's documented max of 500 events (docs/API_CONTRACT.md
  // §7), which can realistically approach/exceed that on its own. 1mb leaves
  // comfortable headroom without being unboundedly permissive.
  app.useBodyParser('json', { limit: '1mb' });

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
