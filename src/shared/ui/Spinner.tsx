import { cn } from './cn';

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-block animate-spin rounded-full border-2', className)}
      style={{
        width: size,
        height: size,
        borderColor: 'var(--accent)',
        borderRightColor: 'transparent',
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
