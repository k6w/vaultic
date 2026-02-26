import { useState, useMemo, useCallback } from 'react';
import { useVault } from '@hooks/useVault';
import { useTotp } from '@hooks/useTotp';
import { useCountdown } from '@hooks/useCountdown';
import { sendMessage } from '@shared/messages';
import type { TwoFactorAccount } from '@shared/types';
import SearchBar from '../../../popup/components/SearchBar';
import CountdownRing from '../../../popup/components/CountdownRing';
import AccountForm from './AccountForm';

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
    } catch {
      // Fallback
    }
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
    } catch {
      // Handle error
    }
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
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-white">Authenticator</h1>
        <button
          onClick={() => { setEditingAccount(undefined); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto px-3">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="text-gray-600 mb-3"
            >
              <path
                d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-400 mb-1">
              {search ? 'No matching accounts' : 'No 2FA accounts yet'}
            </p>
            {!search && (
              <p className="text-xs text-gray-500">Click "Add Account" to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAccounts.map((account) => {
              const code = codes.get(account.id) ?? '------';
              const isCopied = copiedId === account.id;

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800/50 transition-colors duration-150 group"
                >
                  {/* Issuer icon */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full ${getIssuerColor(account.issuer)} flex items-center justify-center`}
                  >
                    <span className="text-white text-sm font-semibold">
                      {account.issuer.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{account.issuer}</p>
                    <p className="text-xs text-gray-400 truncate">{account.label}</p>
                  </div>

                  {/* TOTP code + countdown */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold text-white tracking-wider">
                      {formatCode(code)}
                    </span>
                    <CountdownRing
                      remainingSeconds={remainingSeconds}
                      period={account.period}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(account.id, code)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                      title="Copy code"
                    >
                      {isCopied ? (
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

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                      title="Edit account"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeletingId(account.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors duration-150"
                      title="Delete account"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Account</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors duration-150"
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
