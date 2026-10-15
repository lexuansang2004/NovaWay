import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Vehicle, VehicleInput, VehicleType } from '@/services/vehiclesService';

interface VehicleFormProps {
  initialValue?: Vehicle;
  onSubmit: (input: VehicleInput) => Promise<void>;
  onCancel: () => void;
}

export function VehicleForm({ initialValue, onSubmit, onCancel }: VehicleFormProps) {
  const [type, setType] = useState<VehicleType>(initialValue?.type ?? 'motorbike');
  const [licensePlate, setLicensePlate] = useState(initialValue?.license_plate ?? '');
  const [brandModel, setBrandModel] = useState(initialValue?.brand_model ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ type, license_plate: licensePlate, brand_model: brandModel || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Thông tin phương tiện"
      aria-busy={submitting}
      aria-describedby={error ? errorId : undefined}
      className="@container flex min-w-0 flex-col gap-4 rounded-xl border border-cyan-400/20 bg-slate-900/60 p-3 [overflow-wrap:anywhere] sm:p-5"
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 @min-[38rem]:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="vehicle-type" className="text-sm font-medium text-cyan-50/80">
            Loại xe
          </label>
          <select
            id="vehicle-type"
            value={type}
            onChange={(e) => setType(e.target.value as VehicleType)}
            className="h-auto min-h-11 w-full min-w-0 rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-base text-white focus-visible:border-cyan-400/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cyan-400/30"
          >
            <option value="motorbike">Xe máy</option>
            <option value="car">Ô tô</option>
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="license-plate" className="text-sm font-medium text-cyan-50/80">
            Biển số
          </label>
          <Input
            id="license-plate"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="59A-12345"
            required
            className="h-auto min-h-11 border-white/10 bg-slate-950/60 py-2 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30 md:text-base"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="brand-model" className="text-sm font-medium text-cyan-50/80">
            Hãng/Dòng xe (tuỳ chọn)
          </label>
          <Input
            id="brand-model"
            value={brandModel}
            onChange={(e) => setBrandModel(e.target.value)}
            placeholder="Honda SH"
            className="h-auto min-h-11 border-white/10 bg-slate-950/60 py-2 text-base text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30 md:text-base"
          />
        </div>
      </div>

      {error && <p id={errorId} role="alert" className="min-w-0 text-sm font-medium text-red-400">{error}</p>}

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={submitting}
          className="h-auto min-h-11 min-w-11 max-w-full whitespace-normal border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 [overflow-wrap:anywhere] hover:from-cyan-300 hover:to-emerald-300"
        >
          {submitting ? 'Đang lưu...' : 'Lưu'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-auto min-h-11 min-w-11 max-w-full whitespace-normal text-slate-300 [overflow-wrap:anywhere] hover:bg-white/5 hover:text-white"
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
