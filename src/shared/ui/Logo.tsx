import { cn } from './cn';

/** Vaultic wordmark: a keyhole-shield mark + display-type name. */
export function Logo({
  size = 20,
  showText = true,
  className,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="flex-shrink-0"
      >
        <path
          d="M12 2.5 4.5 5.6v5.2c0 4.6 3.2 8.9 7.5 10 4.3-1.1 7.5-5.4 7.5-10V5.6L12 2.5Z"
          fill="var(--accent-soft)"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10.5" r="2.1" fill="var(--accent)" />
        <path d="M12 12.4v3.1" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {showText && (
        <span
          className="font-display font-semibold tracking-tight text-text"
          style={{ fontSize: size * 0.82 }}
        >
          Vaultic
        </span>
      )}
    </span>
  );
}
