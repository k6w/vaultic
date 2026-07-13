import { useState, useCallback, useRef } from 'react';
import { Check, Copy, Pencil, Trash2, Pin, PinOff, QrCode } from 'lucide-react';
import CountdownRing from '../../../popup/components/CountdownRing';
import type { TwoFactorAccount, ListDensity } from '@shared/types';
import { ServiceIcon, cn } from '@shared/ui';
import { copyWithClear } from '@shared/clipboard';

function formatCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return code.slice(0, mid) + ' ' + code.slice(mid);
}

export interface AccountRowProps {
  account: TwoFactorAccount;
  code: string;
  remainingSeconds: number;
  density: ListDensity;
  clearSeconds?: number;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (a: TwoFactorAccount) => void;
  onDelete: (id: string) => void;
  onTogglePin: (a: TwoFactorAccount) => void;
  onShowQr: (a: TwoFactorAccount) => void;
}

export default function AccountRow({
  account,
  code,
  remainingSeconds,
  density,
  clearSeconds = 0,
  selectMode,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onTogglePin,
  onShowQr,
}: AccountRowProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLSpanElement>(null);
  const compact = density === 'compact';

  const copy = useCallback(async () => {
    try {
      await copyWithClear(code, clearSeconds);
      setCopied(true);
      const el = codeRef.current;
      if (el) {
        el.classList.remove('animate-code-pop');
        void el.offsetWidth;
        el.classList.add('animate-code-pop');
      }
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }, [code, clearSeconds]);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    if (selectMode) onToggleSelect(account.id);
    else copy();
  };

  const codeColor =
    remainingSeconds <= 5
      ? 'var(--danger)'
      : remainingSeconds <= 10
        ? 'var(--warning)'
        : undefined;

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg cursor-pointer transition-colors duration-150',
        compact ? 'px-3 py-1.5' : 'px-3 py-2.5',
        selected ? 'bg-accent-soft' : 'hover:bg-surface-hover active:bg-surface-2'
      )}
    >
      {selectMode && (
        <span
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
            selected ? 'bg-accent border-accent text-accent-fg' : 'border-border-strong'
          )}
        >
          {selected && <Check size={13} />}
        </span>
      )}

      <div className="relative">
        <ServiceIcon
          issuer={account.issuer}
          icon={account.icon}
          size={compact ? 30 : 36}
        />
        {account.pinned && !selectMode && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-accent-fg">
            <Pin size={8} fill="currentColor" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-text">{account.issuer}</p>
        {account.label && (
          <p className="truncate text-[11px] leading-tight text-text-muted">{account.label}</p>
        )}
        {!compact && account.tags && account.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {account.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-2 px-1.5 py-px text-[10px] text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions — absolute overlay so they never reserve row width */}
      {!selectMode && (
        <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg bg-surface-hover pl-3 group-hover:flex">
          <RowAction label={account.pinned ? 'Unpin' : 'Pin'} onClick={() => onTogglePin(account)}>
            {account.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </RowAction>
          <RowAction label="Copy" onClick={copy}>
            {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          </RowAction>
          <RowAction label="Show QR" onClick={() => onShowQr(account)}>
            <QrCode size={14} />
          </RowAction>
          <RowAction label="Edit" onClick={() => onEdit(account)}>
            <Pencil size={14} />
          </RowAction>
          <RowAction label="Delete" danger onClick={() => onDelete(account.id)}>
            <Trash2 size={14} />
          </RowAction>
        </div>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          ref={codeRef}
          className={cn(
            'font-mono font-semibold tracking-[0.06em] tnum transition-colors duration-300',
            compact ? 'text-sm' : 'text-[17px]',
            copied ? 'text-accent' : 'text-text'
          )}
          style={copied ? undefined : { color: codeColor }}
        >
          {formatCode(code)}
        </span>
        <CountdownRing
          remainingSeconds={remainingSeconds}
          period={account.period}
          size={compact ? 22 : 28}
          showLabel={!compact}
        />
      </div>
    </div>
  );
}

function RowAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-action
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors',
        danger ? 'hover:text-danger hover:bg-danger-soft' : 'hover:text-text hover:bg-surface-2'
      )}
    >
      {children}
    </button>
  );
}
