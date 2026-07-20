import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { VehicleAuthorizationModule } from './vehicle-authorization/vehicle-authorization.module';
import { BiometricModule } from './biometric/biometric.module';

// Remaining domain modules (TripsModule, RealtimeGatewayModule, SyncModule,
// MismatchDetectionModule, TerrainWarningsModule — see docs/ARCHITECTURE.md
// §3.1) are added incrementally in their own micro-steps (2.x onward), not here.
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
    HealthModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    VehicleAuthorizationModule,
    BiometricModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
