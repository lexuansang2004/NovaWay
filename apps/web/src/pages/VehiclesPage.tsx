import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const pageRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const deleteFocusIntent = useRef<{ id: string; row: HTMLElement; moved: boolean } | null>(null);

  useEffect(() => {
    const trackFocus = (event: FocusEvent) => {
      const intent = deleteFocusIntent.current;
      if (intent && event.target instanceof Node && !intent.row.contains(event.target)) intent.moved = true;
    };
    document.addEventListener('focusin', trackFocus);
    return () => {
      document.removeEventListener('focusin', trackFocus);
      deleteFocusIntent.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const intent = deleteFocusIntent.current;
    if (!intent || pendingDeleteId === intent.id || loading) return;
    deleteFocusIntent.current = null;
    // A removed row can lose focus to BODY. Restore only that operation's loss,
    // never a user's move to another control, dialog, route or background tab.
    if (!intent.moved && !intent.row.isConnected && document.hasFocus() && document.activeElement === document.body && pageRef.current?.isConnected) {
      addButtonRef.current?.focus();
    }
  }, [loading, pendingDeleteId, vehicles]);

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
    const focusIntent = deleteFocusIntent.current;
    setActionError(null);
    try {
      await deleteVehicle(vehicle.id);
      setPendingDeleteId(null);
      await reload();
    } catch (err) {
      if (deleteFocusIntent.current === focusIntent) deleteFocusIntent.current = null;
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
    <div ref={pageRef} className="@container mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-3 py-6 [overflow-wrap:anywhere] sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-semibold text-white">Quản lý phương tiện</h1>
          <p className="mt-1 text-sm text-slate-400">Thêm, sửa, xoá và chọn phương tiện đang hoạt động.</p>
        </div>
        {formState.mode === 'closed' && (
          <Button
            ref={addButtonRef}
            onClick={() => setFormState({ mode: 'create' })}
            className="h-auto min-h-11 max-w-full whitespace-normal border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 [overflow-wrap:anywhere] hover:from-cyan-300 hover:to-emerald-300"
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
            <article
              key={vehicle.id}
              aria-label={`Phương tiện ${vehicle.license_plate}`}
              className="flex min-w-0 flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur @min-[36rem]:flex-row @min-[36rem]:items-center @min-[36rem]:justify-between"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-cyan-200">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-medium text-white">{vehicle.license_plate}</p>
                  <p className="text-sm text-slate-400">
                    {vehicle.brand_model ?? (vehicle.type === 'car' ? 'Ô tô' : 'Xe máy')}
                  </p>
                </div>
                {vehicle.is_active && (
                  <span className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                    <CheckCircle2 className="h-3 w-3 shrink-0" /> Đang hoạt động
                  </span>
                )}
              </div>

              {pendingDeleteId === vehicle.id ? (
                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 @min-[36rem]:justify-end">
                  <span className="w-full min-w-0 text-sm text-red-300">Xoá phương tiện này?</span>
                  <Button
                    size="sm"
                    aria-label={`Xác nhận xoá phương tiện ${vehicle.license_plate}`}
                    onClickCapture={(event) => {
                      const row = event.currentTarget.closest('article');
                      deleteFocusIntent.current = row?.contains(document.activeElement)
                        ? { id: vehicle.id, row, moved: false }
                        : null;
                    }}
                    onClick={() => handleDelete(vehicle)}
                    className="h-auto min-h-11 min-w-11 max-w-full whitespace-normal border-0 bg-red-500 font-semibold text-white [overflow-wrap:anywhere] hover:bg-red-400"
                  >
                    Xoá
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Huỷ xoá phương tiện ${vehicle.license_plate}`}
                    onClick={() => setPendingDeleteId(null)}
                    className="h-auto min-h-11 min-w-11 max-w-full whitespace-normal text-slate-300 [overflow-wrap:anywhere] hover:bg-white/5 hover:text-white"
                  >
                    Huỷ
                  </Button>
                </div>
              ) : (
                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 @min-[36rem]:justify-end">
                  {!vehicle.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Đặt phương tiện ${vehicle.license_plate} đang dùng`}
                      onClick={() => handleActivate(vehicle)}
                      className="h-auto min-h-11 max-w-full whitespace-normal border-cyan-400/30 bg-transparent text-cyan-200 [overflow-wrap:anywhere] hover:bg-cyan-400/10"
                    >
                      Đặt đang dùng
                    </Button>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Sửa phương tiện ${vehicle.license_plate}`}
                    onClick={() => setFormState({ mode: 'edit', vehicle })}
                    className="h-11 w-11 text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Xoá phương tiện ${vehicle.license_plate}`}
                    onClick={() => setPendingDeleteId(vehicle.id)}
                    className="h-11 w-11 text-red-300/80 hover:bg-red-500/10 hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
