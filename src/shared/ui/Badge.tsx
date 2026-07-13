import { X } from 'lucide-react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-secondary border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Removable tag chip. */
export function Tag({
  children,
  onRemove,
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 text-[11px] font-medium rounded-full',
        'bg-accent-soft text-accent',
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
          aria-label="Remove tag"
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}
