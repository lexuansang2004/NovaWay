import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

// docs/API_CONTRACT.md §6 — keeps the /realtime namespace's CORS policy in
// sync with the HTTP API's WEB_ORIGIN (main.ts's app.enableCors()). This
// can't be done via @WebSocketGateway's `cors` option directly: decorator
// arguments are evaluated at class-decoration time (module import), before
// ConfigModule has loaded WEB_ORIGIN from the environment, so a decorator-level
// value would either be stale or force falling back to `cors: true` (any
// origin). Overriding createIOServer() here runs at actual server-bind time,
// once ConfigService is guaranteed to hold the validated value.
export class ConfiguredSocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.configService.get<string>('WEB_ORIGIN'),
        credentials: true,
      },
    });
  }
}
