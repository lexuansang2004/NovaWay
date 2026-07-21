import { cn } from '@/lib/utils';

// Nền map line-art tối dùng chung cho /login và /dashboard.
// Thuần SVG/CSS, không dùng ảnh ngoài.

interface MapGridBackdropProps {
  className?: string;
  withRadar?: boolean;
}

const MARKERS = [
  { cx: 150, cy: 430 },
  { cx: 330, cy: 300 },
  { cx: 520, cy: 360 },
  { cx: 650, cy: 210 },
] as const;

export function MapGridBackdrop({ className, withRadar = true }: MapGridBackdropProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(circle_at_78%_82%,rgba(16,185,129,0.10),transparent_55%)]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="backdrop-route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="70%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="backdrop-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g stroke="rgba(148,163,184,0.10)" strokeWidth="1">
          {[120, 240, 360, 480].map((y) => (
            <path key={`h${y}`} d={`M0,${y} H800`} />
          ))}
          {[160, 320, 480, 640].map((x) => (
            <path key={`v${x}`} d={`M${x},0 V600`} />
          ))}
        </g>

        <path
          d="M-20,470 C 140,360 250,470 340,320 S 540,180 660,220 T 840,150"
          fill="none"
          stroke="url(#backdrop-route)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#backdrop-glow)"
          opacity="0.55"
        />

        {MARKERS.map(({ cx, cy }, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="4"
            fill="#67e8f9"
            opacity="0.55"
            filter="url(#backdrop-glow)"
          />
        ))}
      </svg>

      {withRadar && (
        <div className="absolute left-[42%] top-[52%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20">
          <div className="radar-ring absolute inset-0 rounded-full border border-cyan-400/25" />
          <div
            className="radar-ring absolute inset-0 rounded-full border border-cyan-400/25"
            style={{ animationDelay: '1.3s' }}
          />
        </div>
      )}
    </div>
  );
}
