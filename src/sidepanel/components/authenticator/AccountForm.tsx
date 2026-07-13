import { useState, useEffect } from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage } from '@shared/messages';
import { parseOTPAuthURI } from '@shared/totp';
import type { TwoFactorAccount, Folder } from '@shared/types';
import { Modal, Input, Textarea, Field, Button, Tag, cn } from '@shared/ui';

interface AccountFormProps {
  account?: TwoFactorAccount;
  folders: Folder[];
  onSave: (account: TwoFactorAccount) => void;
  onClose: () => void;
}

const BASE32_REGEX = /^[A-Z2-7=]+$/i;

const fieldCls =
  'w-full h-10 bg-surface-2 border border-border text-text rounded-md px-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors';

export default function AccountForm({ account, folders, onSave, onClose }: AccountFormProps) {
  const isEditing = !!account;

  const [issuer, setIssuer] = useState(account?.issuer ?? '');
  const [label, setLabel] = useState(account?.label ?? '');
  const [secret, setSecret] = useState(account?.secret ?? '');
  const [algorithm, setAlgorithm] = useState<TwoFactorAccount['algorithm']>(account?.algorithm ?? 'SHA1');
  const [digits, setDigits] = useState<TwoFactorAccount['digits']>(account?.digits ?? 6);
  const [period, setPeriod] = useState(account?.period ?? 30);
  const [folderId, setFolderId] = useState<string>(account?.folderId ?? '');
  const [tags, setTags] = useState<string[]>(account?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState(account?.note ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Smart detection: pasting an otpauth:// URI auto-parses it.
  useEffect(() => {
    if (secret.trim().startsWith('otpauth://')) {
      try {
        const parsed = parseOTPAuthURI(secret.trim());
        if (parsed.issuer) setIssuer(parsed.issuer);
        if (parsed.label) setLabel(parsed.label);
        if (parsed.secret) setSecret(parsed.secret);
        if (parsed.algorithm) setAlgorithm(parsed.algorithm);
        if (parsed.digits) setDigits(parsed.digits);
        if (parsed.period) setPeriod(parsed.period);
        setError(null);
      } catch {
        /* keep typing */
      }
    }
  }, [secret]);

  const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();

  const validate = (): string | null => {
    if (!cleanSecret) return 'Secret key is required';
    if (!BASE32_REGEX.test(cleanSecret))
      return 'Invalid secret key — use only letters A–Z and digits 2–7.';
    if (period < 1) return 'Period must be at least 1 second';
    return null;
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) return setError(validationError);

    setSaving(true);
    try {
      const now = Date.now();
      const accountData: TwoFactorAccount = {
        id: account?.id ?? uuidv4(),
        issuer: issuer.trim() || 'Unknown',
        label: label.trim(),
        secret: cleanSecret,
        algorithm,
        digits,
        period,
        icon: account?.icon,
        folderId: folderId || undefined,
        tags: tags.length ? tags : undefined,
        note: note.trim() || undefined,
        pinned: account?.pinned,
        sortOrder: account?.sortOrder,
        createdAt: account?.createdAt ?? now,
        updatedAt: now,
      };

      await sendMessage({
        type: isEditing ? 'UPDATE_ACCOUNT' : 'ADD_ACCOUNT',
        account: accountData,
      });
      onSave(accountData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const advancedModified = algorithm !== 'SHA1' || digits !== 6 || period !== 30;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? 'Edit account' : 'Add account'}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add account'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Secret key *" hint="Paste the secret or a full otpauth:// URI">
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="e.g. I65VU7K5ZQL7WB4E"
            autoFocus={!isEditing}
            className="font-mono tracking-wider"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Service name">
            <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="GitHub" />
          </Field>
          <Field label="Account / email">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="you@example.com" />
          </Field>
        </div>

        <Field label="Folder">
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={fieldCls}>
            <option value="">Ungrouped</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags" hint="Press Enter or comma to add">
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent/40">
            {tags.map((t) => (
              <Tag key={t} onRemove={() => setTags(tags.filter((x) => x !== t))}>
                {t}
              </Tag>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              placeholder={tags.length ? '' : 'work, personal…'}
              className="min-w-[80px] flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </Field>

        {/* Advanced */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text transition-colors"
          >
            <ChevronRight size={13} className={cn('transition-transform', showAdvanced && 'rotate-90')} />
            Advanced
            {advancedModified && <span className="text-accent">· modified</span>}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Algorithm">
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as TwoFactorAccount['algorithm'])}
                    className={fieldCls}
                  >
                    <option value="SHA1">SHA-1</option>
                    <option value="SHA256">SHA-256</option>
                    <option value="SHA512">SHA-512</option>
                  </select>
                </Field>
                <Field label="Digits">
                  <select
                    value={digits}
                    onChange={(e) => setDigits(Number(e.target.value) as TwoFactorAccount['digits'])}
                    className={fieldCls}
                  >
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                  </select>
                </Field>
                <Field label="Period (s)">
                  <Input
                    type="number"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    min={1}
                  />
                </Field>
              </div>
              <Field label="Secure note" hint="Stored encrypted — e.g. recovery codes">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Backup / recovery codes…"
                  rows={3}
                />
              </Field>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-danger">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
