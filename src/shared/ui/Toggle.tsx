import { cn } from './cn';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

/** Accessible switch built on tokens. */
export function Toggle({ checked, onChange, disabled, label, id }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full',
        'transition-colors duration-200 focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-border-strong'
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{
          height: 18,
          width: 18,
          transform: checked ? 'translateX(22px)' : 'translateX(3px)',
        }}
      />
    </button>
  );
}
