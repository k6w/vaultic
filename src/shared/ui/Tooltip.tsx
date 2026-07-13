import { cn } from './cn';

/**
 * Lightweight CSS-only tooltip. Wraps a trigger; shows `label` on hover/focus.
 * For richer needs use a title attribute — this is for icon rails and chips.
 */
export function Tooltip({
  label,
  side = 'right',
  children,
  className,
}: {
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
}) {
  const pos: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  };
  return (
    <span className={cn('relative inline-flex group/tt', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md px-2 py-1',
          'text-[11px] font-medium bg-surface-2 text-text border border-border shadow-pop',
          'opacity-0 scale-95 transition-all duration-100',
          'group-hover/tt:opacity-100 group-hover/tt:scale-100',
          'group-focus-within/tt:opacity-100 group-focus-within/tt:scale-100',
          pos[side]
        )}
      >
        {label}
      </span>
    </span>
  );
}
