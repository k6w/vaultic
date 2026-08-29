import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Download,
  Upload,
  ShieldCheck,
  QrCode,
  FileJson,
  AlertTriangle,
  Lock,
  Link2,
  Check,
  Copy,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { sendMessage } from '@shared/messages';
import { buildOTPAuthURI, parseOTPAuthURI } from '@shared/totp';
import {
  createEncryptedBackup,
  isEncryptedBackup,
  readEncryptedBackup,
} from '@shared/backup';
import { parseMigrationUri, buildMigrationUri } from '@shared/gauth';
import { toQrDataUrl } from '@shared/qr';
import type { TwoFactorAccount, Folder, VaultData } from '@shared/types';
import {
  Card,
  Button,
  Textarea,
  Input,
  Field,
  Modal,
  Badge,
  Spinner,
  cn,
} from '@shared/ui';

// ── Types ──────────────────────────────────────────────────────────────

type ConflictResolution = 'skip' | 'replace' | 'keep-both';

interface ImportCandidate {
  account: TwoFactorAccount;
  selected: boolean;
  hasConflict: boolean;
  conflictWith?: TwoFactorAccount;
  resolution: ConflictResolution;
}

interface MailAccountExport {
  address: string;
  password: string;
  label?: string;
  createdAt: number;
}

interface ExportData {
  version: 1;
  exportedAt: string;
  accounts: TwoFactorAccount[];
  mailAccounts?: MailAccountExport[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function findConflict(
  candidate: Partial<TwoFactorAccount>,
  existing: TwoFactorAccount[],
): TwoFactorAccount | undefined {
  return existing.find(
    (e) =>
      e.issuer.toLowerCase() === (candidate.issuer ?? '').toLowerCase() &&
      e.label.toLowerCase() === (candidate.label ?? '').toLowerCase(),
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
    </button>
  );
}

/** Section wrapper: icon + title + description + body. */
function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-text-secondary">{icon}</span>
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</h2>
      </div>
      {description && <p className="mb-3 px-1 text-xs text-text-secondary">{description}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ImportPreview({
  candidates,
  onToggle,
  onResolutionChange,
  onImport,
  onCancel,
  importing,
}: {
  candidates: ImportCandidate[];
  onToggle: (index: number) => void;
  onResolutionChange: (index: number, resolution: ConflictResolution) => void;
  onImport: () => void;
  onCancel: () => void;
  importing: boolean;
}) {
  const selectedCount = candidates.filter((c) => c.selected).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          {selectedCount} of {candidates.length} accounts selected
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onImport} disabled={selectedCount === 0 || importing}>
            {importing ? 'Importing...' : `Import selected (${selectedCount})`}
          </Button>
        </div>
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {candidates.map((candidate, index) => (
          <div
            key={index}
            className={cn(
              'rounded-md border bg-surface-2 p-3 transition-colors',
              candidate.hasConflict ? 'border-warning/50' : 'border-border',
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={candidate.selected}
                onChange={() => onToggle(index)}
                className="mt-1"
                style={{ accentColor: 'var(--accent)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">
                    {candidate.account.issuer}
                  </p>
                  {candidate.hasConflict && (
                    <Badge tone="warning">
                      <AlertTriangle size={11} /> Conflict
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-text-muted">{candidate.account.label}</p>

                {/* Conflict resolution */}
                {candidate.hasConflict && candidate.selected && (
                  <div className="mt-2 flex gap-3">
                    {(['skip', 'replace', 'keep-both'] as ConflictResolution[]).map((res) => (
                      <label key={res} className="flex cursor-pointer items-center gap-1">
                        <input
                          type="radio"
                          name={`conflict-${index}`}
                          checked={candidate.resolution === res}
                          onChange={() => onResolutionChange(index, res)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        <span className="text-xs text-text-secondary">
                          {res === 'keep-both'
                            ? 'Keep both'
                            : res.charAt(0).toUpperCase() + res.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ImportExportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [existingAccounts, setExistingAccounts] = useState<TwoFactorAccount[]>([]);
  const [existingFolders, setExistingFolders] = useState<Folder[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [uriText, setUriText] = useState('');
  const [gauthText, setGauthText] = useState('');
  const [uriExportList, setUriExportList] = useState<string[] | null>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allUrisCopied, setAllUrisCopied] = useState(false);

  // Encrypted backup export modal
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupConfirm, setBackupConfirm] = useState('');
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  // Encrypted backup import (password prompt)
  const [pendingBackupText, setPendingBackupText] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importPasswordError, setImportPasswordError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  // Google Authenticator export QR
  const [gauthQr, setGauthQr] = useState<{ dataUrl: string; count: number } | null>(null);

  // Load existing accounts + folders for conflict detection / merge
  const loadExistingAccounts = useCallback(async () => {
    try {
      const response = await sendMessage<{ vault?: VaultData }>({ type: 'GET_VAULT' });
      setExistingAccounts(response.vault?.accounts ?? []);
      setExistingFolders(response.vault?.folders ?? []);
    } catch {
      setExistingAccounts([]);
      setExistingFolders([]);
    }
  }, []);

  useEffect(() => {
    loadExistingAccounts();
  }, [loadExistingAccounts]);

  // ── Export handlers ────────────────────────────────────────────────

  const handleJsonExport = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await sendMessage<{ vault?: VaultData }>({ type: 'EXPORT_VAULT' });
      const accounts = response.vault?.accounts ?? [];
      const mailAccounts = response.vault?.mailAccounts ?? [];
      if (accounts.length === 0 && mailAccounts.length === 0) {
        setError('No accounts to export');
        return;
      }
      const mailExport: MailAccountExport[] = mailAccounts.map((m) => ({
        address: m.address,
        password: m.password,
        label: m.label,
        createdAt: m.createdAt,
      }));
      const exportData: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        accounts,
        ...(mailExport.length > 0 ? { mailAccounts: mailExport } : {}),
      };
      const json = JSON.stringify(exportData, null, 2);
      downloadFile(json, `2fa-manager-backup-${todayString()}.json`, 'application/json');
      const parts: string[] = [];
      if (accounts.length > 0) parts.push(`${accounts.length} 2FA accounts`);
      if (mailExport.length > 0) parts.push(`${mailExport.length} mail accounts`);
      setSuccessMessage(`Exported ${parts.join(' and ')}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUriExport = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await sendMessage<{ vault?: VaultData }>({ type: 'EXPORT_VAULT' });
      const accounts = response.vault?.accounts ?? [];
      if (accounts.length === 0) {
        setError('No accounts to export');
        return;
      }
      const uris = accounts.map((account) => buildOTPAuthURI(account));
      setUriExportList(uris);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCopyAllUris = async () => {
    if (!uriExportList) return;
    try {
      await navigator.clipboard.writeText(uriExportList.join('\n'));
      setAllUrisCopied(true);
      setTimeout(() => setAllUrisCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // ── Encrypted backup export ────────────────────────────────────────

  const handleEncryptedExport = async () => {
    setBackupError(null);
    if (backupPassword.length < 8) {
      setBackupError('Use a backup password of at least 8 characters.');
      return;
    }
    if (backupPassword !== backupConfirm) {
      setBackupError('Passwords do not match.');
      return;
    }
    setBackupBusy(true);
    try {
      const response = await sendMessage<{ vault?: VaultData }>({ type: 'EXPORT_VAULT' });
      const accounts = response.vault?.accounts ?? [];
      const folders = response.vault?.folders ?? [];
      const mailAccounts = response.vault?.mailAccounts ?? [];
      const settings = response.vault?.settings;
      if (accounts.length === 0 && mailAccounts.length === 0 && folders.length === 0) {
        setBackupError('Nothing to back up yet.');
        return;
      }
      const json = await createEncryptedBackup(
        { accounts, folders, mailAccounts, settings },
        backupPassword,
        Date.now(),
      );
      downloadFile(json, `vaultic-backup-${todayString()}.vaultic`, 'application/json');
      await sendMessage({ type: 'UPDATE_SETTINGS', settings: { lastBackupAt: Date.now() } });
      setBackupModalOpen(false);
      setBackupPassword('');
      setBackupConfirm('');
      setSuccessMessage('Encrypted backup downloaded. Keep the password safe — it can’t be recovered.');
    } catch (err) {
      setBackupError((err as Error).message);
    } finally {
      setBackupBusy(false);
    }
  };

  // ── Import helpers ─────────────────────────────────────────────────

  const buildCandidates = (accounts: TwoFactorAccount[]): ImportCandidate[] => {
    return accounts.map((account) => {
      const conflict = findConflict(account, existingAccounts);
      return {
        account,
        selected: true,
        hasConflict: !!conflict,
        conflictWith: conflict,
        resolution: conflict ? 'skip' : 'skip',
      };
    });
  };

  // Add any folders from a backup that aren't already present (by id).
  const importFolders = async (folders: Folder[]) => {
    const existingIds = new Set(existingFolders.map((f) => f.id));
    const toAdd = folders.filter((f) => !existingIds.has(f.id));
    for (const folder of toAdd) {
      await sendMessage({ type: 'ADD_FOLDER', folder });
    }
    if (toAdd.length > 0) await loadExistingAccounts();
  };

  const handleToggleCandidate = (index: number) => {
    setCandidates((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleResolutionChange = (index: number, resolution: ConflictResolution) => {
    setCandidates((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], resolution };
      return next;
    });
  };

  const executeImport = async () => {
    if (!candidates) return;
    setImporting(true);
    setError(null);

    try {
      const selected = candidates.filter((c) => c.selected);
      const toImport: TwoFactorAccount[] = [];

      for (const candidate of selected) {
        if (candidate.hasConflict) {
          switch (candidate.resolution) {
            case 'skip':
              continue;
            case 'replace': {
              // Use the existing account's ID so it overwrites
              const replaced = {
                ...candidate.account,
                id: candidate.conflictWith!.id,
                updatedAt: Date.now(),
              };
              toImport.push(replaced);
              break;
            }
            case 'keep-both': {
              // Give it a new ID and slightly modified label
              const kept = {
                ...candidate.account,
                id: uuidv4(),
                label: candidate.account.label + ' (imported)',
                updatedAt: Date.now(),
              };
              toImport.push(kept);
              break;
            }
          }
        } else {
          toImport.push({ ...candidate.account, id: uuidv4(), updatedAt: Date.now() });
        }
      }

      if (toImport.length > 0) {
        await sendMessage({ type: 'IMPORT_ACCOUNTS', accounts: toImport });
        await loadExistingAccounts();
      }

      setSuccessMessage(`Imported ${toImport.length} accounts`);
      setCandidates(null);
      setJsonText('');
      setUriText('');
      setGauthText('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  // ── JSON import ────────────────────────────────────────────────────

  const processJsonImport = (raw: string) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const parsed = JSON.parse(raw);
      const accounts: unknown[] = parsed.accounts;

      if (!Array.isArray(accounts)) {
        setError('Invalid format: expected an object with an "accounts" array');
        return;
      }

      const now = Date.now();
      const validated: TwoFactorAccount[] = [];

      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i] as Record<string, unknown>;
        if (!acc.issuer || !acc.secret) {
          setError(`Account at index ${i} is missing required fields (issuer, secret)`);
          return;
        }
        validated.push({
          id: (acc.id as string) ?? uuidv4(),
          issuer: String(acc.issuer),
          label: String(acc.label ?? ''),
          secret: String(acc.secret),
          algorithm: (acc.algorithm as TwoFactorAccount['algorithm']) ?? 'SHA1',
          digits: (acc.digits as TwoFactorAccount['digits']) ?? 6,
          period: (acc.period as number) ?? 30,
          icon: acc.icon as string | undefined,
          createdAt: (acc.createdAt as number) ?? now,
          updatedAt: (acc.updatedAt as number) ?? now,
        });
      }

      setCandidates(buildCandidates(validated));
    } catch {
      setError('Invalid JSON');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setJsonText(text);
      processJsonImport(text);
    };
    reader.readAsText(file);

    // Reset file input so the same file can be selected again
    e.target.value = '';
  };

  const handleJsonPasteImport = () => {
    if (!jsonText.trim()) {
      setError('Please paste JSON data');
      return;
    }
    processJsonImport(jsonText);
  };

  // ── Encrypted / smart backup import ────────────────────────────────

  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (isEncryptedBackup(text)) {
        setPendingBackupText(text);
        setImportPassword('');
        setImportPasswordError(null);
      } else {
        // Plain JSON backup → route through the same preview/merge flow.
        setJsonText(text);
        processJsonImport(text);
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  };

  const confirmBackupDecrypt = async () => {
    if (!pendingBackupText) return;
    setImportBusy(true);
    setImportPasswordError(null);
    try {
      const payload = await readEncryptedBackup(pendingBackupText, importPassword);
      await sendMessage({
        type: 'IMPORT_BACKUP_DATA',
        folders: payload.folders ?? [],
        mailAccounts: payload.mailAccounts ?? [],
        settings: payload.settings,
      });
      await loadExistingAccounts();
      setCandidates(buildCandidates(payload.accounts ?? []));
      setPendingBackupText(null);
      setImportPassword('');
    } catch {
      setImportPasswordError('Incorrect password, or the file is not a valid Vaultic backup.');
    } finally {
      setImportBusy(false);
    }
  };

  // ── URI import ─────────────────────────────────────────────────────

  const handleUriImport = () => {
    setError(null);
    setSuccessMessage(null);

    const lines = uriText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setError('Please paste at least one otpauth:// URI');
      return;
    }

    const now = Date.now();
    const parsed: TwoFactorAccount[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const partial = parseOTPAuthURI(lines[i]);
        parsed.push({
          id: uuidv4(),
          issuer: partial.issuer ?? '',
          label: partial.label ?? '',
          secret: partial.secret ?? '',
          algorithm: partial.algorithm ?? 'SHA1',
          digits: partial.digits ?? 6,
          period: partial.period ?? 30,
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        errors.push(`Line ${i + 1}: invalid URI`);
      }
    }

    if (parsed.length === 0) {
      setError(errors.join('; '));
      return;
    }

    if (errors.length > 0) {
      setError(`${errors.length} invalid URI(s) skipped: ${errors.join('; ')}`);
    }

    setCandidates(buildCandidates(parsed));
  };

  // ── Google Authenticator import / export ───────────────────────────

  const handleGauthImport = () => {
    setError(null);
    setSuccessMessage(null);

    const uri = gauthText.trim();
    if (!uri) {
      setError('Paste your Google Authenticator export link first.');
      return;
    }

    try {
      const partials = parseMigrationUri(uri);
      const now = Date.now();
      const accounts: TwoFactorAccount[] = partials.map((p) => ({
        id: crypto.randomUUID(),
        issuer: p.issuer ?? '',
        label: p.label ?? '',
        secret: p.secret ?? '',
        algorithm: p.algorithm ?? 'SHA1',
        digits: p.digits ?? 6,
        period: p.period ?? 30,
        createdAt: now,
        updatedAt: now,
      }));
      setCandidates(buildCandidates(accounts));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleGauthExport = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await sendMessage<{ vault?: VaultData }>({ type: 'EXPORT_VAULT' });
      const accounts = response.vault?.accounts ?? [];
      if (accounts.length === 0) {
        setError('No accounts to export');
        return;
      }
      const uri = buildMigrationUri(accounts, 1);
      const dataUrl = await toQrDataUrl(uri, 240);
      setGauthQr({ dataUrl, count: accounts.length });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // ── URI inline validation ─────────────────────────────────────────

  const uriLineStatus = uriText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      try {
        parseOTPAuthURI(line);
        return { line, valid: true };
      } catch {
        return { line, valid: false };
      }
    });

  // ── Dismiss messages ──────────────────────────────────────────────

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-base font-semibold text-text">Import &amp; export</h1>
      </div>

      {/* Status messages */}
      {(successMessage || error) && (
        <div className="px-4 pb-3">
          {successMessage && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-2.5">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span className="text-sm">{successMessage}</span>
              </div>
              <button onClick={clearMessages} className="text-accent hover:opacity-80">
                <X size={14} />
              </button>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5">
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
              <button onClick={clearMessages} className="text-danger hover:opacity-80">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        {/* Import preview (shown when candidates are loaded) */}
        {candidates && (
          <Card>
            <h3 className="mb-3 font-display text-sm font-semibold text-text">Review import</h3>
            <ImportPreview
              candidates={candidates}
              onToggle={handleToggleCandidate}
              onResolutionChange={handleResolutionChange}
              onImport={executeImport}
              onCancel={() => {
                setCandidates(null);
                clearMessages();
              }}
              importing={importing}
            />
          </Card>
        )}

        {/* ── Encrypted backup (recommended) ─────────────────────────── */}
        <Section
          icon={<ShieldCheck size={16} />}
          title="Encrypted backup"
          description="Password-protected and safe to store anywhere. Recommended."
        >
          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-text">
                  Export encrypted backup
                  <Badge tone="accent">Recommended</Badge>
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Downloads a <span className="font-mono">.vaultic</span> file encrypted with a
                  password you choose.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setBackupError(null);
                setBackupPassword('');
                setBackupConfirm('');
                setBackupModalOpen(true);
              }}
            >
              <Lock size={14} /> Export encrypted
            </Button>
          </Card>

          <Card className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text">Import a backup</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Restore from a <span className="font-mono">.vaultic</span> or{' '}
                <span className="font-mono">.json</span> file. You&rsquo;ll be asked for the
                password if it&rsquo;s encrypted.
              </p>
            </div>
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".vaultic,.json,application/json"
              onChange={handleBackupFileUpload}
              className="hidden"
            />
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-3 text-text-secondary transition-colors hover:border-border-strong hover:text-text"
            >
              <Upload size={16} />
              <span className="text-sm">Choose backup file</span>
            </button>
          </Card>
        </Section>

        {/* ── Google Authenticator ───────────────────────────────────── */}
        <Section
          icon={<QrCode size={16} />}
          title="Google Authenticator"
          description="Move accounts to or from the Google Authenticator app."
        >
          <Card className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text">Import from Google Authenticator</p>
              <p className="mt-0.5 text-xs text-text-muted">
                In the app, tap Transfer accounts &rarr; Export, then paste the{' '}
                <span className="font-mono">otpauth-migration://</span> link the QR encodes.
              </p>
            </div>
            <Textarea
              value={gauthText}
              onChange={(e) => setGauthText(e.target.value)}
              placeholder="otpauth-migration://offline?data=..."
              rows={3}
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={handleGauthImport} disabled={!gauthText.trim()}>
              <Link2 size={14} /> Parse accounts
            </Button>
          </Card>

          <Card className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text">Export to Google Authenticator</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Generates a QR you can scan from the Google Authenticator app. Very large libraries
                may need to be re-run.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleGauthExport}>
              <QrCode size={14} /> Show migration QR
            </Button>
          </Card>
        </Section>

        {/* ── Plain text ─────────────────────────────────────────────── */}
        <Section
          icon={<FileJson size={16} />}
          title="Plain text"
          description={
            <span className="flex items-center gap-1.5 text-warning">
              <AlertTriangle size={13} className="flex-shrink-0" />
              Plain text — anyone with the file can read your secrets.
            </span>
          }
        >
          {/* JSON export */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">JSON export</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  2FA accounts and mail credentials, unencrypted.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleJsonExport}>
                <Download size={14} /> Export
              </Button>
            </div>
          </Card>

          {/* URI export */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">URI export</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  As <span className="font-mono">otpauth://</span> URIs, unencrypted.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleUriExport}>
                <Download size={14} /> Export
              </Button>
            </div>

            {uriExportList && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted">{uriExportList.length} URIs</p>
                  <Button size="sm" variant="ghost" onClick={handleCopyAllUris}>
                    {allUrisCopied ? (
                      <>
                        <Check size={13} className="text-accent" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy all
                      </>
                    )}
                  </Button>
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {uriExportList.map((uri, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-2"
                    >
                      <p className="flex-1 break-all font-mono text-xs text-text-secondary">
                        {uri}
                      </p>
                      <CopyButton text={uri} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setUriExportList(null)}
                  className="text-xs text-text-muted transition-colors hover:text-text"
                >
                  Close
                </button>
              </div>
            )}
          </Card>

          {/* JSON import */}
          <Card className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text">JSON import</p>
              <p className="mt-0.5 text-xs text-text-muted">Import from a plain JSON backup file.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-3 text-text-secondary transition-colors hover:border-border-strong hover:text-text"
            >
              <FileJson size={16} />
              <span className="text-sm">Choose .json file</span>
            </button>

            <Field label="Or paste JSON">
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"accounts": [...]}'
                rows={3}
                className="font-mono text-xs"
              />
            </Field>

            <Button size="sm" onClick={handleJsonPasteImport} disabled={!jsonText.trim()}>
              Import JSON
            </Button>
          </Card>

          {/* URI import */}
          <Card className="space-y-3">
            <div>
              <p className="text-sm font-medium text-text">URI import</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Paste <span className="font-mono">otpauth://</span> URIs, one per line.
              </p>
            </div>

            <Textarea
              value={uriText}
              onChange={(e) => setUriText(e.target.value)}
              placeholder={
                'otpauth://totp/GitHub:user@example.com?secret=ABC&issuer=GitHub\notpauth://totp/Google:user@gmail.com?secret=XYZ&issuer=Google'
              }
              rows={4}
              className="font-mono text-xs"
            />

            {uriLineStatus.length > 0 && (
              <div className="space-y-0.5">
                {uriLineStatus.map((status, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {status.valid ? (
                      <CheckCircle2 size={12} className="flex-shrink-0 text-accent" />
                    ) : (
                      <XCircle size={12} className="flex-shrink-0 text-danger" />
                    )}
                    <span
                      className={cn(
                        'truncate font-mono text-xs',
                        status.valid ? 'text-text-muted' : 'text-danger',
                      )}
                    >
                      {status.line.length > 60 ? status.line.slice(0, 60) + '...' : status.line}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button size="sm" onClick={handleUriImport} disabled={!uriText.trim()}>
              Import URIs
            </Button>
          </Card>
        </Section>
      </div>

      {/* Encrypted backup export modal */}
      {backupModalOpen && (
        <Modal
          open
          onClose={() => {
            if (backupBusy) return;
            setBackupModalOpen(false);
          }}
          title="Encrypt your backup"
          description="Choose a password to protect the file. You'll need it to restore."
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setBackupModalOpen(false)}
                disabled={backupBusy}
              >
                Cancel
              </Button>
              <Button onClick={handleEncryptedExport} disabled={backupBusy}>
                {backupBusy ? 'Encrypting...' : 'Download backup'}
              </Button>
            </>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEncryptedExport();
            }}
            className="space-y-3"
          >
            <div className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-warning">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                This password can&rsquo;t be recovered. If you lose it, the backup can&rsquo;t be
                opened.
              </p>
            </div>
            <Field label="Backup password">
              <Input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
            </Field>
            <Field label="Confirm password" error={backupError ?? undefined}>
              <Input
                type="password"
                value={backupConfirm}
                onChange={(e) => setBackupConfirm(e.target.value)}
                placeholder="Re-enter password"
                invalid={!!backupError}
              />
            </Field>
          </form>
        </Modal>
      )}

      {/* Encrypted backup import password modal */}
      {pendingBackupText && (
        <Modal
          open
          onClose={() => {
            if (importBusy) return;
            setPendingBackupText(null);
            setImportPassword('');
            setImportPasswordError(null);
          }}
          title="Unlock backup"
          description="Enter the password this backup was encrypted with."
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingBackupText(null);
                  setImportPassword('');
                  setImportPasswordError(null);
                }}
                disabled={importBusy}
              >
                Cancel
              </Button>
              <Button onClick={confirmBackupDecrypt} disabled={importBusy}>
                {importBusy ? 'Unlocking...' : 'Unlock'}
              </Button>
            </>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmBackupDecrypt();
            }}
          >
            <Field label="Backup password" error={importPasswordError ?? undefined}>
              <Input
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Enter backup password"
                invalid={!!importPasswordError}
                autoFocus
              />
            </Field>
          </form>
        </Modal>
      )}

      {/* Google Authenticator export QR modal */}
      {gauthQr && (
        <Modal
          open
          onClose={() => setGauthQr(null)}
          title="Scan into Google Authenticator"
          description={`Open Google Authenticator, tap Add → Scan a QR code, then scan this to import ${gauthQr.count} account${gauthQr.count === 1 ? '' : 's'}.`}
          size="sm"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-surface-2 p-3">
              {gauthQr.dataUrl ? (
                <img src={gauthQr.dataUrl} alt="Migration QR code" width={224} height={224} />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center">
                  <Spinner size={22} />
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-warning">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                This QR contains your secrets in plain form. Only scan it where no one can see your
                screen.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
