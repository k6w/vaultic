import { cn } from './cn';

export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

/** Pill segmented control for small mutually-exclusive choices. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 bg-surface-2 border border-border rounded-full',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full font-medium',
              'transition-colors duration-150 focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent/50',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-xs',
              active
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-text-secondary hover:text-text'
            )}
          >
            {opt.icon}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
