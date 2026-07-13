import { useState } from 'react';
import { getFaviconUrl } from '@shared/favicon';
import { cn } from './cn';

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#6366f1',
];

/** Deterministic fallback color from the issuer name. */
export function issuerColor(issuer: string): string {
  let hash = 0;
  for (let i = 0; i < issuer.length; i++) {
    hash = issuer.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export interface ServiceIconProps {
  issuer: string;
  icon?: string;
  size?: number;
  className?: string;
}

/** Favicon for a service with a colored-initial fallback. */
export function ServiceIcon({ issuer, icon, size = 36, className }: ServiceIconProps) {
  const [failed, setFailed] = useState(false);
  const url = getFaviconUrl(issuer, icon);
  const radius = Math.round(size * 0.28);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        className={cn('flex-shrink-0 object-cover bg-surface-2', className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <div
      className={cn('flex-shrink-0 flex items-center justify-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: issuerColor(issuer),
      }}
      aria-hidden
    >
      <span className="font-display font-bold text-white" style={{ fontSize: size * 0.42 }}>
        {(issuer || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
