import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from '../vehicles/vehicle.entity';
import { VehicleMismatchWarning } from './vehicle-mismatch-warning.entity';

// docs/API_CONTRACT.md §6 mismatch:warning example ("85 km/h trong 3 phút")
// is specifically a declared-motorbike-actually-a-car scenario. No car
// threshold in MVP — there's no established "too fast to be a car"
// heuristic, and FR-MISMATCH's motivating case only goes one direction.
const SPEED_THRESHOLD_KMH_BY_VEHICLE_TYPE: Partial<Record<VehicleType, number>> = {
  motorbike: 60,
};

// AC-MISMATCH-01: "liên tục trong một khoảng thời gian đủ dài (ví dụ 3 phút,
// theo mock ở micro-step 6.1)".
const SUSTAINED_DURATION_MS = 3 * 60 * 1000;

interface Episode {
  aboveSinceMs: number;
  speeds: number[];
  warningCreated: boolean;
}

@Injectable()
export class MismatchDetectionService {
  // Per-trip sliding state. Not persisted — a server restart mid-trip
  // just restarts the 3-minute count, an acceptable MVP tradeoff (no
  // trip-end hook exists yet to clear entries either; Trip API is step
  // 7.1). Keyed by trip_id, one entry per trip currently being tracked.
  private readonly episodes = new Map<string, Episode>();

  constructor(
    @InjectRepository(VehicleMismatchWarning)
    private readonly warningsRepository: Repository<VehicleMismatchWarning>,
  ) {}

  // Called inline for every accepted GPS event (docs/ARCHITECTURE.md §6:
  // "MismatchDetectionModule (đánh giá inline)"). Returns the newly created
  // warning the one time an episode crosses the sustained-duration
  // threshold, or null otherwise (including every event after that, for
  // the same episode — FR-MISMATCH-02 creates *a* warning, not one per event).
  async evaluate(
    tripId: string,
    vehicleType: VehicleType,
    speedKmh: number,
    eventTimestampIso: string,
  ): Promise<VehicleMismatchWarning | null> {
    const threshold = SPEED_THRESHOLD_KMH_BY_VEHICLE_TYPE[vehicleType];
    if (threshold === undefined) {
      return null;
    }

    if (speedKmh <= threshold) {
      // FR-MISMATCH-02 requires the threshold to be exceeded *continuously*
      // — a single sample back at/under threshold ends the episode.
      this.episodes.delete(tripId);
      return null;
    }

    const eventTimeMs = new Date(eventTimestampIso).getTime();
    let episode = this.episodes.get(tripId);
    if (!episode) {
      episode = { aboveSinceMs: eventTimeMs, speeds: [], warningCreated: false };
      this.episodes.set(tripId, episode);
    }
    episode.speeds.push(speedKmh);

    if (episode.warningCreated || eventTimeMs - episode.aboveSinceMs < SUSTAINED_DURATION_MS) {
      return null;
    }

    episode.warningCreated = true;
    const avgSpeed = episode.speeds.reduce((sum, s) => sum + s, 0) / episode.speeds.length;
    const minutes = Math.round(SUSTAINED_DURATION_MS / 60000);

    const warning = this.warningsRepository.create({
      tripId,
      declaredVehicleType: vehicleType,
      // FR-MISMATCH-05 / AGENTS.md terminology rules — neutral wording only,
      // matches the exact phrasing already given as an example in
      // API_CONTRACT.md §6.
      observedBehaviorSummary: `Tốc độ trung bình ${avgSpeed.toFixed(0)} km/h trong ${minutes} phút`,
    });
    return this.warningsRepository.save(warning);
  }
}
