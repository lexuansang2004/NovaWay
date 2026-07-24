import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { VehicleAuthorizationModule } from './vehicle-authorization/vehicle-authorization.module';
import { BiometricModule } from './biometric/biometric.module';
import { TripsModule } from './trips/trips.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RoutingModule } from './routing/routing.module';
import { SyncModule } from './sync/sync.module';
import { TerrainWarningsModule } from './terrain-warnings/terrain-warnings.module';
import { ObservabilityModule } from './observability/metrics.module';
import { LoggingInterceptor } from './observability/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    // NFR-API-01 / OPEN_ITEMS_AFTER_MVP.md §5 — initial conservative limit
    // (5 attempts/min), pending a real load benchmark. Only applied where
    // @UseGuards(ThrottlerGuard) is used explicitly (AuthController.login) —
    // registering the module does not throttle every route globally.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 5 }]),
    ObservabilityModule,
    HealthModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    VehicleAuthorizationModule,
    BiometricModule,
    TripsModule,
    RealtimeModule,
    RoutingModule,
    SyncModule,
    TerrainWarningsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
