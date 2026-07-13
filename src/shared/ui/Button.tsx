import { forwardRef } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium select-none ' +
  'transition-[background-color,color,box-shadow,transform,opacity] duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-card',
  secondary:
    'bg-surface-2 text-text border border-border hover:bg-surface-hover hover:border-border-strong',
  ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text',
  danger: 'bg-danger text-white hover:opacity-90',
  soft: 'bg-accent-soft text-accent hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-11 px-5 text-sm rounded-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', pill, block, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        pill && 'rounded-full',
        block && 'w-full',
        className
      )}
      {...props}
    />
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  label: string;
}

const iconSizes: Record<Size, string> = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-9 w-9 rounded-md',
  lg: 'h-10 w-10 rounded-lg',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', label, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], iconSizes[size], 'p-0', className)}
      {...props}
    />
  );
});
