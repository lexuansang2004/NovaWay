import { apiClient } from '@/lib/apiClient';
import { getToken } from '@/services/authService';

export type VehicleType = 'motorbike' | 'car';

export interface Vehicle {
  id: string;
  type: VehicleType;
  license_plate: string;
  brand_model: string | null;
  is_active: boolean;
}

export interface VehicleInput {
  type: VehicleType;
  license_plate: string;
  brand_model?: string;
}

function requireToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error('Chưa đăng nhập.');
  }
  return token;
}

export async function listVehicles(): Promise<Vehicle[]> {
  const { vehicles } = await apiClient.get<{ vehicles: Vehicle[] }>('/vehicles', requireToken());
  return vehicles;
}

export function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return apiClient.post<Vehicle>('/vehicles', input, requireToken());
}

export function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  return apiClient.patch<Vehicle>(`/vehicles/${id}`, input, requireToken());
}

export function deleteVehicle(id: string): Promise<void> {
  return apiClient.delete<void>(`/vehicles/${id}`, requireToken());
}

export function activateVehicle(id: string): Promise<{ id: string; is_active: boolean }> {
  return apiClient.post(`/vehicles/${id}/activate`, undefined, requireToken());
}
