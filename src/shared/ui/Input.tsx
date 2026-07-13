import { forwardRef } from 'react';
import { cn } from './cn';

const fieldBase =
  'w-full bg-surface-2 border border-border text-text rounded-md text-sm ' +
  'placeholder:text-text-muted transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent ' +
  'disabled:opacity-60';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        fieldBase,
        'h-10 px-3.5',
        invalid && 'border-danger focus:ring-danger/50 focus:border-danger',
        className
      )}
      {...props}
    />
  );
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        fieldBase,
        'px-3.5 py-2.5 resize-y min-h-[80px]',
        invalid && 'border-danger focus:ring-danger/50 focus:border-danger',
        className
      )}
      {...props}
    />
  );
});

/** Label + helper/error wrapper for form fields. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
