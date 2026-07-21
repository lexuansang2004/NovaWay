import { useState } from 'react';
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
      className="flex flex-col gap-4 rounded-xl border border-cyan-400/20 bg-slate-900/60 p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vehicle-type" className="text-sm font-medium text-cyan-50/80">
            Loại xe
          </label>
          <select
            id="vehicle-type"
            value={type}
            onChange={(e) => setType(e.target.value as VehicleType)}
            className="h-9 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white focus-visible:border-cyan-400/60 focus-visible:outline-none"
          >
            <option value="motorbike">Xe máy</option>
            <option value="car">Ô tô</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="license-plate" className="text-sm font-medium text-cyan-50/80">
            Biển số
          </label>
          <Input
            id="license-plate"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="59A-12345"
            required
            className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="brand-model" className="text-sm font-medium text-cyan-50/80">
            Hãng/Dòng xe (tuỳ chọn)
          </label>
          <Input
            id="brand-model"
            value={brandModel}
            onChange={(e) => setBrandModel(e.target.value)}
            placeholder="Honda SH"
            className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/30"
          />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={submitting}
          className="border-0 bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold text-slate-950 hover:from-cyan-300 hover:to-emerald-300"
        >
          {submitting ? 'Đang lưu...' : 'Lưu'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-slate-300 hover:bg-white/5 hover:text-white"
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
