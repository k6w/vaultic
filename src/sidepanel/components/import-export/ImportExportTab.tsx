import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage } from '@shared/messages';
import { buildOTPAuthURI, parseOTPAuthURI } from '@shared/totp';
import type { TwoFactorAccount, VaultData } from '@shared/types';

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
      className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
      title="Copy"
    >
      {copied ? (
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-300">
          {selectedCount} of {candidates.length} accounts selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onImport}
            disabled={selectedCount === 0 || importing}
            className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
          >
            {importing ? 'Importing...' : `Import Selected (${selectedCount})`}
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1.5">
        {candidates.map((candidate, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition-colors duration-150 ${
              candidate.hasConflict
                ? 'border-amber-500/50 bg-gray-900'
                : 'border-gray-700 bg-gray-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={candidate.selected}
                onChange={() => onToggle(index)}
                className="mt-1 accent-emerald-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    {candidate.account.issuer}
                  </p>
                  {candidate.hasConflict && (
                    <span title="Conflict: account with same issuer and label already exists">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{candidate.account.label}</p>

                {/* Conflict resolution */}
                {candidate.hasConflict && candidate.selected && (
                  <div className="mt-2 flex gap-3">
                    {(['skip', 'replace', 'keep-both'] as ConflictResolution[]).map((res) => (
                      <label key={res} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`conflict-${index}`}
                          checked={candidate.resolution === res}
                          onChange={() => onResolutionChange(index, res)}
                          className="accent-emerald-500"
                        />
                        <span className="text-xs text-gray-400 capitalize">
                          {res === 'keep-both' ? 'Keep Both' : res.charAt(0).toUpperCase() + res.slice(1)}
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

  // State
  const [existingAccounts, setExistingAccounts] = useState<TwoFactorAccount[]>([]);
  const [jsonText, setJsonText] = useState('');
  const [uriText, setUriText] = useState('');
  const [uriExportList, setUriExportList] = useState<string[] | null>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allUrisCopied, setAllUrisCopied] = useState(false);

  // Load existing accounts for conflict detection
  const loadExistingAccounts = useCallback(async () => {
    try {
      const response = await sendMessage<{ vault?: VaultData }>({ type: 'GET_VAULT' });
      setExistingAccounts(response.vault?.accounts ?? []);
    } catch {
      setExistingAccounts([]);
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-white">Import / Export</h1>
      </div>

      {/* Status messages */}
      {(successMessage || error) && (
        <div className="px-5 pb-3">
          {successMessage && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm text-emerald-300">{successMessage}</span>
              </div>
              <button onClick={clearMessages} className="text-emerald-400 hover:text-emerald-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-900/30 border border-red-500/30">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-sm text-red-300">{error}</span>
              </div>
              <button onClick={clearMessages} className="text-red-400 hover:text-red-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        {/* Import preview (shown when candidates are loaded) */}
        {candidates && (
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">Import Preview</h3>
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
          </div>
        )}

        {/* ── Export Section ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Export</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* JSON Export Card */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">JSON Export</p>
                  <p className="text-xs text-gray-400 mt-0.5">Export 2FA accounts and mail credentials as JSON</p>
                </div>
                <button
                  onClick={handleJsonExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors duration-150"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </button>
              </div>
            </div>

            {/* URI Export Card */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">URI Export</p>
                  <p className="text-xs text-gray-400 mt-0.5">Export as otpauth:// URIs</p>
                </div>
                <button
                  onClick={handleUriExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors duration-150"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  Export
                </button>
              </div>

              {/* URI export list */}
              {uriExportList && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{uriExportList.length} URIs</p>
                    <button
                      onClick={handleCopyAllUris}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors duration-150"
                    >
                      {allUrisCopied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {uriExportList.map((uri, i) => (
                      <div key={i} className="flex items-center gap-1 p-2 rounded-md bg-gray-800 border border-gray-700">
                        <p className="flex-1 text-xs font-mono text-gray-300 break-all">{uri}</p>
                        <CopyButton text={uri} />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setUriExportList(null)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-150"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Import Section ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Import</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* JSON Import Card */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-700 space-y-3">
              <div>
                <p className="text-sm font-medium text-white">JSON Import</p>
                <p className="text-xs text-gray-400 mt-0.5">Import from a JSON backup file</p>
              </div>

              {/* File picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-300 transition-colors duration-150"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-sm">Choose .json file</span>
              </button>

              {/* Or paste */}
              <div className="relative">
                <p className="text-xs text-gray-500 mb-1.5">Or paste JSON</p>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='{"accounts": [...]}'
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150 resize-none"
                />
              </div>

              <button
                onClick={handleJsonPasteImport}
                disabled={!jsonText.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
              >
                Import JSON
              </button>
            </div>

            {/* URI Import Card */}
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-700 space-y-3">
              <div>
                <p className="text-sm font-medium text-white">URI Import</p>
                <p className="text-xs text-gray-400 mt-0.5">Paste otpauth:// URIs, one per line</p>
              </div>

              <textarea
                value={uriText}
                onChange={(e) => setUriText(e.target.value)}
                placeholder={'otpauth://totp/GitHub:user@example.com?secret=ABC&issuer=GitHub\notpauth://totp/Google:user@gmail.com?secret=XYZ&issuer=Google'}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150 resize-none"
              />

              {/* Inline validation */}
              {uriLineStatus.length > 0 && (
                <div className="space-y-0.5">
                  {uriLineStatus.map((status, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {status.valid ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 flex-shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      <span className={`text-xs font-mono truncate ${status.valid ? 'text-gray-400' : 'text-red-400'}`}>
                        {status.line.length > 60 ? status.line.slice(0, 60) + '...' : status.line}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleUriImport}
                disabled={!uriText.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
              >
                Import URIs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
