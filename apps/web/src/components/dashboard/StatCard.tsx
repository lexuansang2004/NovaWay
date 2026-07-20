import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  Icon: LucideIcon;
  accent?: 'cyan' | 'emerald' | 'amber';
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, string> = {
  cyan: 'text-cyan-300',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
};

export function StatCard({ label, value, Icon, accent = 'cyan' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <Icon className={cn('h-4 w-4', ACCENT[accent])} strokeWidth={1.8} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
