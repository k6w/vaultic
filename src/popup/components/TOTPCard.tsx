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

// Deterministic color based on issuer name
function getIssuerColor(issuer: string): string {
  const colors = [
    'bg-blue-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-red-600',
    'bg-orange-600',
    'bg-amber-600',
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-indigo-600',
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
    // Don't copy if clicking the copy button itself (avoid double copy)
    const target = e.target as HTMLElement;
    if (target.closest('[data-copy-btn]')) return;
    copyToClipboard();
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors duration-150 group"
    >
      {/* Issuer icon */}
      {faviconUrl && !faviconError ? (
        <img
          src={faviconUrl}
          alt={account.issuer}
          className="flex-shrink-0 w-9 h-9 rounded-full"
          onError={() => setFaviconError(true)}
        />
      ) : (
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-full ${getIssuerColor(account.issuer)} flex items-center justify-center`}
        >
          <span className="text-white text-sm font-semibold">
            {account.issuer.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Account info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{account.issuer}</p>
        <p className="text-xs text-gray-400 truncate">{account.label}</p>
      </div>

      {/* TOTP code */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-semibold text-white tracking-wider">
          {formatCode(code)}
        </span>

        <CountdownRing
          remainingSeconds={remainingSeconds}
          period={period}
        />

        {/* Copy button */}
        <button
          data-copy-btn
          onClick={copyToClipboard}
          className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-gray-700 transition-colors duration-150"
          title="Copy code"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
