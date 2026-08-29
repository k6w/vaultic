import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './Button';

type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: Size;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Hide the header close button (still closes on Esc / backdrop). */
  hideClose?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  hideClose,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = `vaultic-dialog-title`;
  const descriptionId = `vaultic-dialog-description`;

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') trapFocus(e, panelRef.current);
    };
    document.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element inside the panel.
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'input,textarea,select,button,[tabindex]'
      );
      first?.focus();
    }, 20);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      returnFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'relative w-full bg-surface-1 border border-border rounded-xl shadow-pop',
          'animate-pop-in max-h-[calc(100vh-2rem)] flex flex-col',
          sizes[size]
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className="font-display text-base font-semibold text-text leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-1 text-xs text-text-secondary">{description}</p>
              )}
            </div>
            {!hideClose && (
              <IconButton label="Close" size="sm" onClick={onClose} className="-mr-1.5 -mt-1">
                <X size={18} />
              </IconButton>
            )}
          </div>
        )}
        <div className="px-5 pb-5 pt-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
