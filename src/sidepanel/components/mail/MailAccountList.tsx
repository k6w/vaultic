import { useState } from 'react';
import type { MailAccount } from '@shared/types';
import { getFaviconUrl } from '@shared/favicon';

interface MailAccountListProps {
  accounts: MailAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const accountColors = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-indigo-500',
  'bg-rose-500', 'bg-orange-500',
];

function getAccountColor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return accountColors[Math.abs(hash) % accountColors.length];
}

function MailAccountIcon({ account }: { account: MailAccount }) {
  const [faviconError, setFaviconError] = useState(false);
  const domain = account.address.split('@')[1];
  const faviconUrl = domain ? getFaviconUrl(domain) : null;
  const localPart = account.address.split('@')[0];

  if (faviconUrl && !faviconError) {
    return (
      <img
        src={faviconUrl}
        alt=""
        className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-800"
        onError={() => setFaviconError(true)}
      />
    );
  }

  return (
    <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${getAccountColor(account.address)} flex items-center justify-center`}>
      <span className="text-white text-xs font-bold uppercase">
        {localPart.charAt(0)}
      </span>
    </div>
  );
}

export default function MailAccountList({ accounts, selectedId, onSelect, onDelete }: MailAccountListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {accounts.map((account) => {
        const isSelected = selectedId === account.id;
        const isConfirming = confirmDeleteId === account.id;

        return (
          <button
            key={account.id}
            onClick={() => onSelect(account.id)}
            className={`
              w-full text-left px-4 py-3 flex items-center gap-3
              transition-colors duration-150 group border-b border-gray-800/40
              ${isSelected
                ? 'bg-gray-800/70'
                : 'hover:bg-gray-800/40 active:bg-gray-800/60'
              }
            `}
          >
            <MailAccountIcon account={account} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              {account.label && (
                <p className="text-xs text-emerald-400 font-medium truncate leading-tight">{account.label}</p>
              )}
              <p className="text-sm text-gray-300 truncate leading-tight">{account.address}</p>
            </div>

            {/* Arrow / Delete */}
            {isConfirming ? (
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleConfirmDelete(e, account.id)}
                  className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors duration-150"
                  title="Confirm delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors duration-150"
                  title="Cancel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => handleDeleteClick(e, account.id)}
                  className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-all duration-150"
                  title="Delete account"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
