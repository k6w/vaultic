import { useState, useMemo } from 'react';
import { useVault } from '@hooks/useVault';
import { useTotp } from '@hooks/useTotp';
import { useCountdown } from '@hooks/useCountdown';
import SearchBar from './SearchBar';
import TOTPCard from './TOTPCard';

export default function TOTPList() {
  const { vault, loading } = useVault();
  const accounts = vault?.accounts ?? [];
  const codes = useTotp(accounts);
  const remainingSeconds = useCountdown(30);
  const [search, setSearch] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const query = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.issuer.toLowerCase().includes(query) ||
        a.label.toLowerCase().includes(query),
    );
  }, [accounts, search]);

  const handleOpenManager = async () => {
    try {
      // Try to open the side panel (Chrome 116+)
      if (chrome?.sidePanel?.open) {
        await chrome.sidePanel.open({ windowId: chrome.windows?.WINDOW_ID_CURRENT });
      } else {
        // Fallback: open sidepanel in a new tab
        const url = chrome.runtime.getURL('sidepanel/index.html');
        await chrome.tabs.create({ url });
      }
    } catch {
      // Final fallback
      const url = chrome.runtime.getURL('sidepanel/index.html');
      await chrome.tabs.create({ url });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto px-1">
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
              <p className="text-xs text-gray-500">
                Open Manager to add accounts
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredAccounts.map((account) => (
              <TOTPCard
                key={account.id}
                account={account}
                code={codes.get(account.id) ?? '------'}
                remainingSeconds={remainingSeconds}
                period={account.period}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-gray-800">
        <button
          onClick={handleOpenManager}
          className="w-full text-sm text-emerald-400 hover:text-emerald-300 font-medium py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors duration-150"
        >
          Open Manager
        </button>
      </div>
    </div>
  );
}
