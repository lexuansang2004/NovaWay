import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleMismatchWarning } from './vehicle-mismatch-warning.entity';
import { MismatchDetectionService } from './mismatch-detection.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleMismatchWarning])],
  providers: [MismatchDetectionService],
  exports: [MismatchDetectionService],
})
export class MismatchDetectionModule {}
