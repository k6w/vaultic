interface CountdownRingProps {
  remainingSeconds: number;
  period: number;
  size?: number;
  showLabel?: boolean;
}

/**
 * The signature "time" element: a ring that drains with the code's lifetime and
 * shifts accent → warning → danger as it nears expiry, with a soft accent glow.
 */
export default function CountdownRing({
  remainingSeconds,
  period,
  size = 30,
  showLabel = true,
}: CountdownRingProps) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / period));
  const dashoffset = circumference * (1 - progress);

  let color = 'var(--accent)';
  if (remainingSeconds <= 5) color = 'var(--danger)';
  else if (remainingSeconds <= 10) color = 'var(--warning)';

  const urgent = remainingSeconds <= 5;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{ filter: urgent ? 'none' : `drop-shadow(0 0 3px ${color}55)` }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute font-mono text-[10px] font-medium tnum"
          style={{ color }}
        >
          {remainingSeconds}
        </span>
      )}
    </div>
  );
}
