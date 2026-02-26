import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage } from '@shared/messages';
import { parseOTPAuthURI } from '@shared/totp';
import type { TwoFactorAccount } from '@shared/types';

interface AccountFormProps {
  account?: TwoFactorAccount;
  onSave: (account: TwoFactorAccount) => void;
  onClose: () => void;
}

type InputMode = 'manual' | 'uri';

const BASE32_REGEX = /^[A-Z2-7=]+$/i;

export default function AccountForm({ account, onSave, onClose }: AccountFormProps) {
  const isEditing = !!account;

  const [mode, setMode] = useState<InputMode>('manual');
  const [issuer, setIssuer] = useState(account?.issuer ?? '');
  const [label, setLabel] = useState(account?.label ?? '');
  const [secret, setSecret] = useState(account?.secret ?? '');
  const [algorithm, setAlgorithm] = useState<TwoFactorAccount['algorithm']>(account?.algorithm ?? 'SHA1');
  const [digits, setDigits] = useState<TwoFactorAccount['digits']>(account?.digits ?? 6);
  const [period, setPeriod] = useState(account?.period ?? 30);
  const [uri, setUri] = useState('');
  const [uriPreview, setUriPreview] = useState<Partial<TwoFactorAccount> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Parse URI when it changes
  useEffect(() => {
    if (mode !== 'uri' || !uri.trim()) {
      setUriPreview(null);
      return;
    }

    try {
      const parsed = parseOTPAuthURI(uri.trim());
      setUriPreview(parsed);
      setError(null);
      // Fill in the manual fields from parsed URI
      if (parsed.issuer) setIssuer(parsed.issuer);
      if (parsed.label) setLabel(parsed.label);
      if (parsed.secret) setSecret(parsed.secret);
      if (parsed.algorithm) setAlgorithm(parsed.algorithm);
      if (parsed.digits) setDigits(parsed.digits);
      if (parsed.period) setPeriod(parsed.period);
    } catch (err) {
      setUriPreview(null);
      setError((err as Error).message);
    }
  }, [uri, mode]);

  const validate = (): string | null => {
    if (!issuer.trim()) return 'Issuer is required';
    if (!label.trim()) return 'Label is required';
    if (!secret.trim()) return 'Secret is required';
    // Remove spaces and validate base32
    const cleanSecret = secret.replace(/\s/g, '');
    if (!BASE32_REGEX.test(cleanSecret)) {
      return 'Secret must be a valid Base32 string (A-Z, 2-7, =)';
    }
    if (period < 1) return 'Period must be at least 1';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
      const now = Date.now();

      const accountData: TwoFactorAccount = {
        id: account?.id ?? uuidv4(),
        issuer: issuer.trim(),
        label: label.trim(),
        secret: cleanSecret,
        algorithm,
        digits,
        period,
        createdAt: account?.createdAt ?? now,
        updatedAt: now,
      };

      if (isEditing) {
        await sendMessage({ type: 'UPDATE_ACCOUNT', account: accountData });
      } else {
        await sendMessage({ type: 'ADD_ACCOUNT', account: accountData });
      }

      onSave(accountData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Account' : 'Add Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors duration-150"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mode toggle (only for new accounts) */}
        {!isEditing && (
          <div className="flex bg-gray-800 rounded-lg p-0.5 mb-5">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors duration-150 ${
                mode === 'manual'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setMode('uri')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors duration-150 ${
                mode === 'uri'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Import URI
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URI mode */}
          {mode === 'uri' && !isEditing && (
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">OTPAuth URI</label>
              <textarea
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="otpauth://totp/..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150 resize-none font-mono"
              />
              {uriPreview && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Preview</p>
                  <p className="text-sm text-white">{uriPreview.issuer}</p>
                  <p className="text-xs text-gray-400">{uriPreview.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {uriPreview.algorithm} / {uriPreview.digits} digits / {uriPreview.period}s
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual entry fields (or always shown when editing) */}
          {(mode === 'manual' || isEditing) && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Issuer *</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="e.g., GitHub"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Label *</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., user@example.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Secret *</label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Base32 encoded secret"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Algorithm</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as TwoFactorAccount['algorithm'])}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                  >
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                    <option value="SHA512">SHA512</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Digits</label>
                  <select
                    value={digits}
                    onChange={(e) => setDigits(Number(e.target.value) as TwoFactorAccount['digits'])}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                  >
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Period</label>
                  <input
                    type="number"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    min={1}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                  />
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
