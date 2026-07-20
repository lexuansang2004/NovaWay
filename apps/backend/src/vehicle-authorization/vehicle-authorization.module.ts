import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { UsersModule } from '../users/users.module';
import { VehicleAuthorization } from './vehicle-authorization.entity';
import { VehicleAuthorizationController } from './vehicle-authorization.controller';
import { AuthorizationsController } from './authorizations.controller';
import { VehicleAuthorizationService } from './vehicle-authorization.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleAuthorization]), VehiclesModule, UsersModule],
  controllers: [VehicleAuthorizationController, AuthorizationsController],
  providers: [VehicleAuthorizationService],
  exports: [VehicleAuthorizationService],
})
export class VehicleAuthorizationModule {}
