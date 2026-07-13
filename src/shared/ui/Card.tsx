import { cn } from './cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: keyof React.JSX.IntrinsicElements;
  padded?: boolean;
  interactive?: boolean;
}

/** Elevated surface with hairline border + soft shadow. */
export function Card({
  as: Tag = 'div',
  padded = true,
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      className={cn(
        'bg-surface-1 border border-border rounded-lg shadow-card',
        padded && 'p-4',
        interactive &&
          'cursor-pointer transition-colors duration-150 hover:bg-surface-hover hover:border-border-strong',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
