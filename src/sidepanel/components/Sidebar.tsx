import { useMemo, useState } from 'react';
import { ArrowLeftRight, Command as CommandIcon, Copy, Lock, Mail, Settings, ShieldCheck } from 'lucide-react';
import { CommandPalette, IconButton, Logo, ThemeToggle, cn, type Command, useCommandPaletteHotkey } from '@shared/ui';
import { useVault } from '@hooks/useVault';
import { useTotp } from '@hooks/useTotp';
import { useTheme } from '@hooks/useTheme';
import { sendMessage } from '@shared/messages';
import { sortAccounts } from '@shared/accounts';
import { copyWithClear } from '@shared/clipboard';
import AuthenticatorTab from './authenticator/AuthenticatorTab';
import MailTab from './mail/MailTab';
import ImportExportTab from './import-export/ImportExportTab';
import SettingsTab from './settings/SettingsTab';

type TabId = 'authenticator' | 'mail' | 'import-export' | 'settings';

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'authenticator', label: 'Codes', icon: <ShieldCheck size={17} /> },
  { id: 'mail', label: 'Mail', icon: <Mail size={17} /> },
  { id: 'import-export', label: 'Data', icon: <ArrowLeftRight size={17} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={17} /> },
];

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabId>('authenticator');
  const { vault } = useVault();
  const { setTheme, theme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useCommandPaletteHotkey();
  const codes = useTotp(vault?.accounts ?? []);
  const clearSeconds = vault?.settings?.clipboardClearSeconds ?? 0;

  const commands = useMemo<Command[]>(() => {
    const accountCommands: Command[] = sortAccounts(vault?.accounts ?? []).map((account) => ({
      id: `copy-${account.id}`,
      title: `Copy ${account.issuer}`,
      subtitle: account.label || undefined,
      icon: <Copy size={16} />,
      keywords: (account.tags ?? []).join(' '),
      run: () => copyWithClear(codes.get(account.id) ?? '', clearSeconds),
    }));
    return [
      ...accountCommands,
      { id: 'go-auth', title: 'Go to Codes', icon: <ShieldCheck size={16} />, run: () => setActiveTab('authenticator') },
      { id: 'go-mail', title: 'Go to Mail', icon: <Mail size={16} />, run: () => setActiveTab('mail') },
      { id: 'go-data', title: 'Go to Data', icon: <ArrowLeftRight size={16} />, run: () => setActiveTab('import-export') },
      { id: 'go-settings', title: 'Go to Settings', icon: <Settings size={16} />, run: () => setActiveTab('settings') },
      {
        id: 'theme', title: 'Cycle theme', icon: <CommandIcon size={16} />, keywords: 'system dark light appearance',
        run: () => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'),
      },
      {
        id: 'lock', title: 'Lock vault', icon: <Lock size={16} />,
        run: () => void sendMessage({ type: 'LOCK' }).then(() => location.reload()),
      },
    ];
  }, [vault?.accounts, codes, clearSeconds, setTheme, theme]);

  const content = {
    authenticator: <AuthenticatorTab />,
    mail: <MailTab />,
    'import-export': <ImportExportTab />,
    settings: <SettingsTab />,
  }[activeTab];

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex h-13 flex-shrink-0 items-center gap-1 border-b border-border bg-surface-1 px-2">
        <div className="mr-1 flex-shrink-0 px-1" title="Vaultic">
          <Logo size={20} showText={false} />
        </div>
        <nav className="flex min-w-0 flex-1 items-center gap-0.5" aria-label="Vaultic sections">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                title={tab.label}
                className={cn(
                  'flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                  active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-text',
                )}
              >
                {tab.icon}
                <span className="hidden min-[520px]:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <IconButton label="Command palette (Ctrl/Command K)" size="sm" onClick={() => setPaletteOpen(true)}>
          <CommandIcon size={17} />
        </IconButton>
        <ThemeToggle size="sm" />
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{content}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
