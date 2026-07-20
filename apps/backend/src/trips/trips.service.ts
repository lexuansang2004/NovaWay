import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from './trip.entity';

// Minimal on purpose — step 3.1 only needs to look trips up for the realtime
// gateway's ownership check. Trip creation/start/end lifecycle is step 7.1.
@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripsRepository: Repository<Trip>,
  ) {}

  findById(id: string): Promise<Trip | null> {
    return this.tripsRepository.findOneBy({ id });
  }
}
