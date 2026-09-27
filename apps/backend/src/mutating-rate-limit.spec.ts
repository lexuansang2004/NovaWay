import { INestApplication, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AddressInfo } from 'node:net';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TripsController } from './trips/trips.controller';
import { VehicleAuthorizationController } from './vehicle-authorization/vehicle-authorization.controller';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';

type ControllerClass = { prototype: object };

const mutationRoutes: [string, ControllerClass, string[], string[]][] = [
  ['VehiclesController', VehiclesController, ['create', 'update', 'remove', 'activate'], ['findAll']],
  ['TripsController', TripsController, ['start', 'end'], ['list', 'detail']],
  ['VehicleAuthorizationController', VehicleAuthorizationController, ['grant', 'revoke'], ['findAll']],
];

describe('R8-1 mutating route rate limits', () => {
  it.each(mutationRoutes)('%s guards every mutating handler without throttling reads', (_name, controller, handlers, reads) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toContain(JwtAuthGuard);
    for (const handler of handlers) {
      const method = (controller.prototype as Record<string, object>)[handler];
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toContain(ThrottlerGuard);
    }
    for (const handler of reads) {
      const method = (controller.prototype as Record<string, object>)[handler];
      expect(Reflect.getMetadata(GUARDS_METADATA, method) ?? []).not.toContain(ThrottlerGuard);
    }
  });

  it('returns 429 after five writes while reads remain available and denied requests stay 401', async () => {
    const vehicle = {
      id: 'vehicle-id',
      type: 'motorbike',
      licensePlate: '59A-12345',
      brandModel: null,
      isActive: false,
    };
    const create = jest.fn().mockResolvedValue(vehicle);
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 5 }])],
      controllers: [VehiclesController],
      providers: [{
        provide: VehiclesService,
        useValue: {
          create,
          findAllByUser: jest.fn().mockResolvedValue([]),
        },
      }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest();
          if (request.headers['x-test-auth'] === 'deny') throw new UnauthorizedException();
          request.user = { id: 'owner-id', email: 'driver@example.com' };
          return true;
        },
      })
      .compile();

    const app: INestApplication = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    const port = (app.getHttpServer().address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/api/vehicles`;

    try {
      for (let attempt = 0; attempt < 6; attempt++) {
        const denied = await fetch(url, { method: 'POST', headers: { 'x-test-auth': 'deny' } });
        expect(denied.status).toBe(401);
      }

      const statuses: number[] = [];
      for (let attempt = 0; attempt < 15; attempt++) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'motorbike', license_plate: '59A-12345' }),
        });
        statuses.push(response.status);
      }
      expect(statuses).toEqual([201, 201, 201, 201, 201, ...Array(10).fill(429)]);
      expect(create).toHaveBeenCalledTimes(5);

      const deniedAfterLimit = await fetch(url, { method: 'POST', headers: { 'x-test-auth': 'deny' } });
      expect(deniedAfterLimit.status).toBe(401);

      for (let attempt = 0; attempt < 6; attempt++) {
        const read = await fetch(url);
        expect(read.status).toBe(200);
      }
    } finally {
      await app.close();
    }
  }, 15_000);
});
