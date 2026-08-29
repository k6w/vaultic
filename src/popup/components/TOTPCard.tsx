import { useState, useCallback, useRef } from 'react';
import { Check, Copy, Pin, Wand2 } from 'lucide-react';
import CountdownRing from './CountdownRing';
import type { TwoFactorAccount } from '@shared/types';
import { ServiceIcon, cn } from '@shared/ui';
import { copyWithClear } from '@shared/clipboard';
import { useCountdown } from '@hooks/useCountdown';

interface TOTPCardProps {
  account: TwoFactorAccount;
  code: string;
  /** Seconds after which the clipboard auto-clears (0 disables). */
  clearSeconds?: number;
  /** When provided, a Fill action appears on hover (autofill into page). */
  onFill?: (account: TwoFactorAccount, code: string) => void;
}

function formatCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return code.slice(0, mid) + ' ' + code.slice(mid);
}

export default function TOTPCard({
  account,
  code,
  clearSeconds = 0,
  onFill,
}: TOTPCardProps) {
  const [copied, setCopied] = useState(false);
  const remainingSeconds = useCountdown(account.period);
  const codeRef = useRef<HTMLSpanElement>(null);

  const copyToClipboard = useCallback(async () => {
    try {
      await copyWithClear(code, clearSeconds);
      setCopied(true);
      // Re-trigger the pop animation.
      const el = codeRef.current;
      if (el) {
        el.classList.remove('animate-code-pop');
        void el.offsetWidth;
        el.classList.add('animate-code-pop');
      }
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, [code, clearSeconds]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    copyToClipboard();
  };

  const codeColor =
    remainingSeconds <= 5
      ? 'var(--danger)'
      : remainingSeconds <= 10
        ? 'var(--warning)'
        : undefined;

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-hover active:bg-surface-2 transition-colors duration-150"
    >
      <div className="relative">
        <ServiceIcon issuer={account.issuer} icon={account.icon} size={36} />
        {account.pinned && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-accent-fg">
            <Pin size={8} fill="currentColor" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate leading-tight">
          {account.issuer}
        </p>
        {account.label && (
          <p className="text-[11px] text-text-muted truncate leading-tight">
            {account.label}
          </p>
        )}
      </div>

      {/* Hover actions — absolute overlay so they never reserve row width */}
      <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-surface-hover pl-3 group-hover:flex">
        {onFill && (
          <button
            data-action
            onClick={() => onFill(account, code)}
            title="Fill on current page"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-accent-soft transition-colors"
          >
            <Wand2 size={14} />
          </button>
        )}
        <button
          data-action
          onClick={copyToClipboard}
          title="Copy code"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
        >
          {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          ref={codeRef}
          className={cn(
            'font-mono text-[17px] font-semibold tracking-[0.06em] tnum transition-colors duration-300',
            copied ? 'text-accent' : 'text-text'
          )}
          style={copied ? undefined : { color: codeColor }}
        >
          {formatCode(code)}
        </span>
        <CountdownRing remainingSeconds={remainingSeconds} period={account.period} size={28} />
      </div>
    </div>
  );
}
