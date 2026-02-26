interface CountdownRingProps {
  remainingSeconds: number;
  period: number;
  size?: number;
}

export default function CountdownRing({
  remainingSeconds,
  period,
  size = 36,
}: CountdownRingProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = remainingSeconds / period;
  const dashoffset = circumference * (1 - progress);

  // Color based on remaining time
  let strokeColor = 'stroke-emerald-500';
  if (remainingSeconds <= 5) {
    strokeColor = 'stroke-red-500';
  } else if (remainingSeconds <= 10) {
    strokeColor = 'stroke-yellow-500';
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className={strokeColor}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      {/* Center text */}
      <span className="absolute text-[10px] font-mono text-gray-300">
        {remainingSeconds}
      </span>
    </div>
  );
}
