import { useState, useCallback } from 'react';
import CountdownRing from './CountdownRing';
import type { TwoFactorAccount } from '@shared/types';
import { getFaviconUrl } from '@shared/favicon';

interface TOTPCardProps {
  account: TwoFactorAccount;
  code: string;
  remainingSeconds: number;
  period: number;
}

function getIssuerColor(issuer: string): string {
  const colors = [
    'bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-red-600',
    'bg-orange-600', 'bg-amber-600', 'bg-emerald-600', 'bg-teal-600',
    'bg-cyan-600', 'bg-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < issuer.length; i++) {
    hash = issuer.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatCode(code: string): string {
  const mid = Math.floor(code.length / 2);
  return code.slice(0, mid) + ' ' + code.slice(mid);
}

export default function TOTPCard({
  account,
  code,
  remainingSeconds,
  period,
}: TOTPCardProps) {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(account.issuer, account.icon);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }, [code]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-copy-btn]')) return;
    copyToClipboard();
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-800/50 active:bg-gray-800/70 transition-colors duration-150 group"
    >
      {/* Issuer icon */}
      {faviconUrl && !faviconError ? (
        <img
          src={faviconUrl}
          alt=""
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800"
          onError={() => setFaviconError(true)}
        />
      ) : (
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg ${getIssuerColor(account.issuer)} flex items-center justify-center`}
        >
          <span className="text-white text-xs font-bold">
            {account.issuer.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Account info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate leading-tight">{account.issuer}</p>
        {account.label && (
          <p className="text-[11px] text-gray-500 truncate leading-tight">{account.label}</p>
        )}
      </div>

      {/* TOTP code + countdown */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`font-mono text-base font-semibold tracking-wider transition-colors duration-300 ${copied ? 'text-emerald-400' : 'text-white'}`}>
          {formatCode(code)}
        </span>

        <CountdownRing
          remainingSeconds={remainingSeconds}
          period={period}
          size={28}
        />
      </div>
    </div>
  );
}
