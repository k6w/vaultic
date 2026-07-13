import { useState, useMemo, useCallback } from 'react';
import { PanelRight, ShieldCheck, Command as CommandIcon, Copy, Wand2, Lock } from 'lucide-react';
import { useVault } from '@hooks/useVault';
import { useTotp } from '@hooks/useTotp';
import { useCountdown } from '@hooks/useCountdown';
import { useTheme } from '@hooks/useTheme';
import { sendMessage } from '@shared/messages';
import { sortAccounts, matchesQuery } from '@shared/accounts';
import { requestAutofill } from '@shared/autofill-client';
import { copyWithClear } from '@shared/clipboard';
import type { TwoFactorAccount } from '@shared/types';
import {
  Logo,
  ThemeToggle,
  IconButton,
  Button,
  Spinner,
  EmptyState,
  CommandPalette,
  useCommandPaletteHotkey,
  type Command,
} from '@shared/ui';
import SearchBar from './SearchBar';
import TOTPCard from './TOTPCard';

export default function TOTPList() {
  const { vault, loading } = useVault();
  const accounts = vault?.accounts ?? [];
  const codes = useTotp(accounts);
  const remainingSeconds = useCountdown(30);
  const { setTheme, theme } = useTheme();
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useCommandPaletteHotkey();
  const clearSeconds = vault?.settings?.clipboardClearSeconds ?? 0;

  const visible = useMemo(
    () => sortAccounts(accounts.filter((a) => matchesQuery(a, search))),
    [accounts, search]
  );

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const handleFill = useCallback(
    async (_account: TwoFactorAccount, code: string) => {
      const res = await requestAutofill(code);
      flash(res.ok ? 'Filled on page' : res.error || 'No code field found');
    },
    [flash]
  );

  const openManager = async () => {
    try {
      if (chrome?.sidePanel?.open) {
        await chrome.sidePanel.open({ windowId: chrome.windows?.WINDOW_ID_CURRENT });
        window.close();
        return;
      }
    } catch {
      /* fall through */
    }
    const url = chrome.runtime.getURL('sidepanel/index.html');
    await chrome.tabs.create({ url });
    window.close();
  };

  const commands = useMemo<Command[]>(() => {
    const accountCmds: Command[] = sortAccounts(accounts).flatMap((a) => {
      const code = codes.get(a.id) ?? '';
      return [
        {
          id: `copy-${a.id}`,
          title: `Copy ${a.issuer}`,
          subtitle: a.label || undefined,
          icon: <Copy size={16} />,
          keywords: `${a.label ?? ''} ${(a.tags ?? []).join(' ')}`,
          run: () => {
            void copyWithClear(code, clearSeconds);
            flash(`Copied ${a.issuer}`);
          },
        },
        {
          id: `fill-${a.id}`,
          title: `Fill ${a.issuer} on page`,
          icon: <Wand2 size={16} />,
          keywords: 'autofill',
          run: () => handleFill(a, code),
        },
      ];
    });
    const actions: Command[] = [
      { id: 'act-manager', title: 'Open manager', icon: <PanelRight size={16} />, run: openManager },
      {
        id: 'act-theme',
        title: 'Cycle theme (system / light / dark)',
        icon: <CommandIcon size={16} />,
        keywords: 'dark light appearance',
        run: () => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'),
      },
      {
        id: 'act-lock',
        title: 'Lock vault',
        icon: <Lock size={16} />,
        run: () => {
          void sendMessage({ type: 'LOCK' }).then(() => window.close());
        },
      },
    ];
    return [...accountCmds, ...actions];
  }, [accounts, codes, clearSeconds, flash, handleFill, setTheme, theme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={22} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <Logo size={19} />
        <div className="flex-1" />
        <IconButton label="Command palette (⌘K)" size="sm" onClick={() => setPaletteOpen(true)}>
          <CommandIcon size={16} />
        </IconButton>
        <ThemeToggle size="sm" />
        <IconButton label="Open manager" size="sm" onClick={openManager}>
          <PanelRight size={17} />
        </IconButton>
      </header>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <SearchBar value={search} onChange={setSearch} autoFocus />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {visible.length === 0 ? (
          <EmptyState
            className="h-full"
            icon={<ShieldCheck size={26} />}
            title={search ? 'No matches' : 'No accounts yet'}
            description={
              search
                ? 'Try a different name or tag.'
                : 'Open the manager to add your first 2FA account, or scan a QR code on any page.'
            }
            action={
              !search && (
                <Button size="sm" onClick={openManager}>
                  Open manager
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-0.5">
            {visible.map((account) => (
              <TOTPCard
                key={account.id}
                account={account}
                code={codes.get(account.id) ?? '------'}
                remainingSeconds={remainingSeconds}
                period={account.period}
                clearSeconds={vault?.settings?.clipboardClearSeconds ?? 0}
                onFill={handleFill}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-2.5 border-t border-border">
        <button
          onClick={openManager}
          className="w-full text-sm text-accent hover:brightness-110 font-medium py-1.5 rounded-md hover:bg-accent-soft transition-colors duration-150"
        >
          Open manager
        </button>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-surface-2 border border-border px-3.5 py-1.5 text-xs text-text shadow-pop animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
