import { useState, useMemo, useCallback } from 'react';
import { useVault } from '@hooks/useVault';
import { useTotp } from '@hooks/useTotp';
import { useCountdown } from '@hooks/useCountdown';
import { sendMessage } from '@shared/messages';
import type { TwoFactorAccount } from '@shared/types';
import { getFaviconUrl } from '@shared/favicon';
import SearchBar from '../../../popup/components/SearchBar';
import CountdownRing from '../../../popup/components/CountdownRing';
import AccountForm from './AccountForm';

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

function AccountIcon({ account }: { account: TwoFactorAccount }) {
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(account.issuer, account.icon);

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
    <div
      className={`flex-shrink-0 w-9 h-9 rounded-lg ${getIssuerColor(account.issuer)} flex items-center justify-center`}
    >
      <span className="text-white text-xs font-bold">
        {account.issuer.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function AuthenticatorTab() {
  const { vault, refetch } = useVault();
  const accounts = vault?.accounts ?? [];
  const codes = useTotp(accounts);
  const remainingSeconds = useCountdown(30);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TwoFactorAccount | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const query = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.issuer.toLowerCase().includes(query) ||
        a.label.toLowerCase().includes(query),
    );
  }, [accounts, search]);

  const handleCopy = useCallback(async (accountId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(accountId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }, []);

  const handleEdit = (account: TwoFactorAccount) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDelete = async (accountId: string) => {
    try {
      await sendMessage({ type: 'DELETE_ACCOUNT', accountId });
      setDeletingId(null);
      refetch();
    } catch { /* ignore */ }
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingAccount(undefined);
    refetch();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-base font-semibold text-white">Authenticator</h1>
        <button
          onClick={() => { setEditingAccount(undefined); setShowForm(true); }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 px-2.5 py-1.5 rounded-md transition-colors duration-150"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto px-2">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-gray-800/80 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-0.5">
              {search ? 'No matching accounts' : 'No 2FA accounts yet'}
            </p>
            {!search && (
              <p className="text-xs text-gray-500">Tap "Add" to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredAccounts.map((account) => {
              const code = codes.get(account.id) ?? '------';
              const isCopied = copiedId === account.id;

              return (
                <div
                  key={account.id}
                  onClick={() => handleCopy(account.id, code)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800/50 active:bg-gray-800/70 transition-colors duration-150 group cursor-pointer"
                >
                  <AccountIcon account={account} />

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate leading-tight">{account.issuer}</p>
                    {account.label && (
                      <p className="text-[11px] text-gray-500 truncate leading-tight">{account.label}</p>
                    )}
                  </div>

                  {/* TOTP code + countdown */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`font-mono text-base font-semibold tracking-wider transition-colors duration-300 ${isCopied ? 'text-emerald-400' : 'text-white'}`}>
                      {formatCode(code)}
                    </span>
                    <CountdownRing
                      remainingSeconds={remainingSeconds}
                      period={account.period}
                      size={28}
                    />
                  </div>

                  {/* Actions — only show on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(account); }}
                      className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                      title="Edit"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingId(account.id); }}
                      className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors duration-150"
                      title="Delete"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Form Modal */}
      {showForm && (
        <AccountForm
          account={editingAccount}
          onSave={handleSave}
          onClose={handleCloseForm}
        />
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 max-w-xs w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-white mb-2">Delete Account</h3>
            <p className="text-sm text-gray-400 mb-5">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-3.5 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors duration-150"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
