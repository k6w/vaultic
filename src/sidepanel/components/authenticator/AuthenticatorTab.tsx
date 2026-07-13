import { useState, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  ShieldCheck,
  FolderCog,
  ArrowUpDown,
  Rows3,
  Rows4,
  CheckSquare,
  Trash2,
  Pin,
  X,
} from 'lucide-react';
import { useVault } from '@hooks/useVault';
import { useTotp } from '@hooks/useTotp';
import { useCountdown } from '@hooks/useCountdown';
import { sendMessage } from '@shared/messages';
import { sortAccounts, matchesQuery } from '@shared/accounts';
import type { TwoFactorAccount, ListDensity } from '@shared/types';
import { Button, IconButton, EmptyState, Tooltip, cn } from '@shared/ui';
import SearchBar from '../../../popup/components/SearchBar';
import AccountRow from './AccountRow';
import AccountForm from './AccountForm';
import FolderManager from './FolderManager';
import ReorderModal from './ReorderModal';
import QrModal from './QrModal';
import ConfirmDialog from '../ConfirmDialog';

type FolderFilter = 'all' | 'none' | string;

export default function AuthenticatorTab() {
  const { vault, refetch } = useVault();
  const accounts = vault?.accounts ?? [];
  const folders = useMemo(
    () => [...(vault?.folders ?? [])].sort((a, b) => a.order - b.order),
    [vault?.folders]
  );
  const density: ListDensity = vault?.settings?.listDensity ?? 'comfortable';
  const codes = useTotp(accounts);
  const remainingSeconds = useCountdown(30);

  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TwoFactorAccount | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFolders, setShowFolders] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [qrAccount, setQrAccount] = useState<TwoFactorAccount | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const visible = useMemo(() => {
    const byFolder = accounts.filter((a) => {
      if (folderFilter === 'all') return true;
      if (folderFilter === 'none') return !a.folderId;
      return a.folderId === folderFilter;
    });
    return sortAccounts(byFolder.filter((a) => matchesQuery(a, search)));
  }, [accounts, folderFilter, search]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = density === 'compact' ? 44 : 62;
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const persist = useCallback(
    (updater: (a: TwoFactorAccount) => TwoFactorAccount, ids: string[]) => {
      const updated = accounts.filter((a) => ids.includes(a.id)).map(updater);
      return sendMessage({ type: 'BULK_UPDATE_ACCOUNTS', accounts: updated }).then(refetch);
    },
    [accounts, refetch]
  );

  const togglePin = useCallback(
    (a: TwoFactorAccount) =>
      sendMessage({
        type: 'UPDATE_ACCOUNT',
        account: { ...a, pinned: !a.pinned, updatedAt: Date.now() },
      }).then(refetch),
    [refetch]
  );

  const setDensity = (d: ListDensity) =>
    sendMessage({ type: 'UPDATE_SETTINGS', settings: { listDensity: d } }).then(refetch);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleDelete = async (id: string) => {
    await sendMessage({ type: 'DELETE_ACCOUNT', accountId: id });
    setDeletingId(null);
    refetch();
  };

  const bulkDelete = async () => {
    await sendMessage({ type: 'BULK_DELETE_ACCOUNTS', accountIds: [...selected] });
    setBulkDeleteOpen(false);
    exitSelect();
    refetch();
  };

  const bulkMove = async (folderId: string | undefined) => {
    await persist((a) => ({ ...a, folderId, updatedAt: Date.now() }), [...selected]);
    exitSelect();
  };

  const bulkPin = async () => {
    await persist((a) => ({ ...a, pinned: true, updatedAt: Date.now() }), [...selected]);
    exitSelect();
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingAccount(undefined);
    refetch();
  };

  const chips: { key: FolderFilter; label: string; color?: string }[] = [
    { key: 'all', label: 'All' },
    ...folders.map((f) => ({ key: f.id, label: f.name, color: f.color })),
    ...(accounts.some((a) => !a.folderId) ? [{ key: 'none' as const, label: 'Ungrouped' }] : []),
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-base font-semibold text-text">Authenticator</h1>
          <span className="text-xs text-text-muted">{accounts.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip label={density === 'compact' ? 'Comfortable' : 'Compact'} side="bottom">
            <IconButton
              label="Toggle density"
              size="sm"
              onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
            >
              {density === 'compact' ? <Rows3 size={17} /> : <Rows4 size={17} />}
            </IconButton>
          </Tooltip>
          <Tooltip label="Select" side="bottom">
            <IconButton
              label="Select accounts"
              size="sm"
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className={selectMode ? 'text-accent' : ''}
            >
              <CheckSquare size={17} />
            </IconButton>
          </Tooltip>
          <Tooltip label="Reorder" side="bottom">
            <IconButton label="Reorder accounts" size="sm" onClick={() => setShowReorder(true)}>
              <ArrowUpDown size={17} />
            </IconButton>
          </Tooltip>
          <Tooltip label="Folders" side="bottom">
            <IconButton label="Manage folders" size="sm" onClick={() => setShowFolders(true)}>
              <FolderCog size={17} />
            </IconButton>
          </Tooltip>
          <Button
            size="sm"
            variant="soft"
            className="ml-1"
            onClick={() => {
              setEditingAccount(undefined);
              setShowForm(true);
            }}
          >
            <Plus size={15} /> Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Folder chips */}
      {chips.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 no-scrollbar">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFolderFilter(c.key)}
              className={cn(
                'flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                folderFilter === c.key
                  ? 'bg-accent text-accent-fg'
                  : 'bg-surface-2 text-text-secondary hover:text-text'
              )}
            >
              {c.color && (
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              )}
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 animate-fade-in">
          <span className="text-xs font-medium text-text">{selected.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={bulkPin}>
            <Pin size={14} /> Pin
          </Button>
          <select
            className="h-8 rounded-md border border-border bg-surface-1 px-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            value=""
            onChange={(e) => bulkMove(e.target.value || undefined)}
          >
            <option value="" disabled>
              Move to…
            </option>
            <option value="">Ungrouped</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 size={14} className="text-danger" />
          </Button>
          <IconButton label="Clear selection" size="sm" onClick={exitSelect}>
            <X size={15} />
          </IconButton>
        </div>
      )}

      {/* List (virtualized) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2">
        {visible.length === 0 ? (
          <EmptyState
            className="h-full"
            icon={<ShieldCheck size={26} />}
            title={search || folderFilter !== 'all' ? 'No matches' : 'No accounts yet'}
            description={
              search || folderFilter !== 'all'
                ? 'Try a different search or folder.'
                : 'Add your first 2FA account, or scan a QR code on any page.'
            }
            action={
              !search &&
              folderFilter === 'all' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAccount(undefined);
                    setShowForm(true);
                  }}
                >
                  <Plus size={15} /> Add account
                </Button>
              )
            }
          />
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const account = visible[vi.index];
              return (
                <div
                  key={account.id}
                  ref={virtualizer.measureElement}
                  data-index={vi.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <AccountRow
                    account={account}
                    code={codes.get(account.id) ?? '------'}
                    remainingSeconds={remainingSeconds}
                    density={density}
                    clearSeconds={vault?.settings?.clipboardClearSeconds ?? 0}
                    selectMode={selectMode}
                    selected={selected.has(account.id)}
                    onToggleSelect={toggleSelect}
                    onEdit={(a) => {
                      setEditingAccount(a);
                      setShowForm(true);
                    }}
                    onDelete={setDeletingId}
                    onTogglePin={togglePin}
                    onShowQr={setQrAccount}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <AccountForm
          account={editingAccount}
          folders={folders}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingAccount(undefined);
          }}
        />
      )}
      {showFolders && (
        <FolderManager folders={folders} onChanged={refetch} onClose={() => setShowFolders(false)} />
      )}
      {showReorder && (
        <ReorderModal
          accounts={accounts}
          onSaved={() => {
            setShowReorder(false);
            refetch();
          }}
          onClose={() => setShowReorder(false)}
        />
      )}
      {qrAccount && <QrModal account={qrAccount} onClose={() => setQrAccount(null)} />}
      {deletingId && (
        <ConfirmDialog
          title="Delete account?"
          description="This can't be undone. Make sure you can still sign in another way."
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      )}
      {bulkDeleteOpen && (
        <ConfirmDialog
          title={`Delete ${selected.size} accounts?`}
          description="This can't be undone."
          confirmLabel="Delete all"
          danger
          onConfirm={bulkDelete}
          onClose={() => setBulkDeleteOpen(false)}
        />
      )}
    </div>
  );
}
