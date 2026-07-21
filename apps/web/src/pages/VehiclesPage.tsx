import { useEffect, useState } from 'react';
import { Car, Bike, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VehicleForm } from '@/components/vehicles/VehicleForm';
import {
  activateVehicle,
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
  type Vehicle,
  type VehicleInput,
} from '@/services/vehiclesService';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; vehicle: Vehicle };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({ mode: 'closed' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setVehicles(await listVehicles());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách phương tiện.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(input: VehicleInput) {
    await createVehicle(input);
    setFormState({ mode: 'closed' });
    await reload();
  }

  async function handleUpdate(id: string, input: VehicleInput) {
    await updateVehicle(id, input);
    setFormState({ mode: 'closed' });
    await reload();
  }

  async function handleDelete(vehicle: Vehicle) {
    setActionError(null);
    try {
      await deleteVehicle(vehicle.id);
      setPendingDeleteId(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không xoá được phương tiện.');
    }
  }

  async function handleActivate(vehicle: Vehicle) {
    setActionError(null);
    try {
      await activateVehicle(vehicle.id);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không đặt được xe đang hoạt động.');
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Quản lý phương tiện</h1>
          <p className="mt-1 text-sm text-slate-400">Thêm, sửa, xoá và chọn phương tiện đang hoạt động.</p>
        </div>
        {formState.mode === 'closed' && (
          <Button
            onClick={() => setFormState({ mode: 'create' })}
            className="border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 hover:from-cyan-300 hover:to-emerald-300"
          >
            <Plus className="h-4 w-4" /> Thêm phương tiện
          </Button>
        )}
      </div>

      {formState.mode === 'create' && (
        <VehicleForm onSubmit={handleCreate} onCancel={() => setFormState({ mode: 'closed' })} />
      )}

      {actionError && <p className="text-sm font-medium text-red-400">{actionError}</p>}

      {loading && <p className="text-sm text-slate-400">Đang tải...</p>}
      {error && <p className="text-sm font-medium text-red-400">{error}</p>}

      {!loading && !error && vehicles.length === 0 && formState.mode !== 'create' && (
        <p className="text-sm text-slate-400">Chưa có phương tiện nào. Thêm phương tiện đầu tiên của bạn.</p>
      )}

      <div className="flex flex-col gap-3">
        {vehicles.map((vehicle) => {
          const isEditing = formState.mode === 'edit' && formState.vehicle.id === vehicle.id;
          const Icon = vehicle.type === 'car' ? Car : Bike;

          if (isEditing) {
            return (
              <VehicleForm
                key={vehicle.id}
                initialValue={vehicle}
                onSubmit={(input) => handleUpdate(vehicle.id, input)}
                onCancel={() => setFormState({ mode: 'closed' })}
              />
            );
          }

          return (
            <div
              key={vehicle.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-cyan-200">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="font-medium text-white">{vehicle.license_plate}</p>
                  <p className="text-sm text-slate-400">
                    {vehicle.brand_model ?? (vehicle.type === 'car' ? 'Ô tô' : 'Xe máy')}
                  </p>
                </div>
                {vehicle.is_active && (
                  <span className="ml-2 flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> Đang hoạt động
                  </span>
                )}
              </div>

              {pendingDeleteId === vehicle.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-300">Xoá phương tiện này?</span>
                  <Button
                    size="sm"
                    onClick={() => handleDelete(vehicle)}
                    className="border-0 bg-red-500 font-semibold text-white hover:bg-red-400"
                  >
                    Xoá
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingDeleteId(null)}
                    className="text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    Huỷ
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!vehicle.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivate(vehicle)}
                      className="border-cyan-400/30 bg-transparent text-cyan-200 hover:bg-cyan-400/10"
                    >
                      Đặt đang dùng
                    </Button>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setFormState({ mode: 'edit', vehicle })}
                    className="text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setPendingDeleteId(vehicle.id)}
                    className="text-red-300/80 hover:bg-red-500/10 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
