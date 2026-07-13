import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Mail,
  ArrowLeftRight,
  Settings,
  Copy,
  Lock,
  Command as CommandIcon,
} from 'lucide-react';
import {
  Logo,
  ThemeToggle,
  Tooltip,
  CommandPalette,
  useCommandPaletteHotkey,
  type Command,
  cn,
} from '@shared/ui';
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

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'authenticator', label: 'Authenticator', icon: <ShieldCheck size={21} /> },
  { id: 'mail', label: 'Mail', icon: <Mail size={21} /> },
  { id: 'import-export', label: 'Import & Export', icon: <ArrowLeftRight size={21} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={21} /> },
];

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabId>('authenticator');
  const { vault } = useVault();
  const { setTheme, theme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useCommandPaletteHotkey();
  const codes = useTotp(vault?.accounts ?? []);
  const clearSeconds = vault?.settings?.clipboardClearSeconds ?? 0;

  const commands = useMemo<Command[]>(() => {
    const accountCmds: Command[] = sortAccounts(vault?.accounts ?? []).map((a) => ({
      id: `copy-${a.id}`,
      title: `Copy ${a.issuer}`,
      subtitle: a.label || undefined,
      icon: <Copy size={16} />,
      keywords: (a.tags ?? []).join(' '),
      run: () => copyWithClear(codes.get(a.id) ?? '', clearSeconds),
    }));
    const actions: Command[] = [
      { id: 'go-auth', title: 'Go to Authenticator', icon: <ShieldCheck size={16} />, run: () => setActiveTab('authenticator') },
      { id: 'go-mail', title: 'Go to Mail', icon: <Mail size={16} />, run: () => setActiveTab('mail') },
      { id: 'go-ie', title: 'Go to Import & Export', icon: <ArrowLeftRight size={16} />, run: () => setActiveTab('import-export') },
      { id: 'go-settings', title: 'Go to Settings', icon: <Settings size={16} />, run: () => setActiveTab('settings') },
      {
        id: 'theme',
        title: 'Cycle theme (system / light / dark)',
        icon: <CommandIcon size={16} />,
        keywords: 'dark light appearance',
        run: () => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'),
      },
      { id: 'lock', title: 'Lock vault', icon: <Lock size={16} />, run: () => void sendMessage({ type: 'LOCK' }).then(() => location.reload()) },
    ];
    return [...accountCmds, ...actions];
  }, [vault?.accounts, codes, clearSeconds, setTheme, theme]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'authenticator':
        return <AuthenticatorTab />;
      case 'mail':
        return <MailTab />;
      case 'import-export':
        return <ImportExportTab />;
      case 'settings':
        return <SettingsTab />;
    }
  };

  return (
    <div className="flex h-full">
      <nav className="flex flex-col items-center w-14 flex-shrink-0 bg-surface-1 border-r border-border py-3">
        <div className="mb-3">
          <Logo size={22} showText={false} />
        </div>
        <div className="flex flex-col items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Tooltip key={tab.id} label={tab.label} side="right">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={tab.label}
                  aria-current={isActive}
                  className={cn(
                    'relative flex items-center justify-center h-10 w-10 rounded-lg',
                    'transition-colors duration-150 focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-accent/50',
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover'
                  )}
                >
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                  )}
                  {tab.icon}
                </button>
              </Tooltip>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-1">
          <Tooltip label="Command palette (⌘K)" side="right">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Command palette"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            >
              <CommandIcon size={18} />
            </button>
          </Tooltip>
          <ThemeToggle size="sm" />
        </div>
      </nav>

      <div className="flex-1 min-w-0 overflow-hidden">{renderTabContent()}</div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
