import { useState } from 'react';
import { Check, ChevronRight, Trash2, X } from 'lucide-react';
import type { MailAccount } from '@shared/types';
import { getFaviconUrl } from '@shared/favicon';
import { cn } from '@shared/ui';

interface MailAccountListProps {
  accounts: MailAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
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
        className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-2"
        onError={() => setFaviconError(true)}
      />
    );
  }

  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
      <span className="text-accent text-xs font-bold uppercase">
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
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      {accounts.map((account) => {
        const isSelected = selectedId === account.id;
        const isConfirming = confirmDeleteId === account.id;

        return (
          <button
            key={account.id}
            onClick={() => onSelect(account.id)}
            className={cn(
              'group w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-lg transition-colors duration-150',
              isSelected ? 'bg-surface-2' : 'hover:bg-surface-hover active:bg-surface-2'
            )}
          >
            <MailAccountIcon account={account} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              {account.label && (
                <p className="text-xs text-accent font-medium truncate leading-tight">{account.label}</p>
              )}
              <p className="text-sm text-text truncate leading-tight">{account.address}</p>
            </div>

            {/* Arrow / Delete */}
            {isConfirming ? (
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <span
                  onClick={(e) => handleConfirmDelete(e, account.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-danger hover:bg-danger-soft transition-colors duration-150"
                  title="Confirm delete"
                >
                  <Check size={14} />
                </span>
                <span
                  onClick={handleCancelDelete}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors duration-150"
                  title="Cancel"
                >
                  <X size={14} />
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span
                  onClick={(e) => handleDeleteClick(e, account.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger-soft opacity-0 group-hover:opacity-100 transition-all duration-150"
                  title="Delete account"
                >
                  <Trash2 size={13} />
                </span>
                <ChevronRight size={16} className="text-text-muted" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
