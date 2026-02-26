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

const BASE32_REGEX = /^[A-Z2-7=]+$/i;

export default function AccountForm({ account, onSave, onClose }: AccountFormProps) {
  const isEditing = !!account;

  const [issuer, setIssuer] = useState(account?.issuer ?? '');
  const [label, setLabel] = useState(account?.label ?? '');
  const [secret, setSecret] = useState(account?.secret ?? '');
  const [algorithm, setAlgorithm] = useState<TwoFactorAccount['algorithm']>(account?.algorithm ?? 'SHA1');
  const [digits, setDigits] = useState<TwoFactorAccount['digits']>(account?.digits ?? 6);
  const [period, setPeriod] = useState(account?.period ?? 30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Smart detection: if user pastes an otpauth:// URI into the secret field, auto-parse it
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
        // Not a valid URI, let user continue typing
      }
    }
  }, [secret]);

  const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();

  const validate = (): string | null => {
    if (!cleanSecret) return 'Secret key is required';
    if (!BASE32_REGEX.test(cleanSecret)) {
      return 'Invalid secret key. Must contain only letters A-Z and digits 2-7.';
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
      const now = Date.now();
      const accountData: TwoFactorAccount = {
        id: account?.id ?? uuidv4(),
        issuer: issuer.trim() || 'Unknown',
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Secret Key - the primary field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Secret Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="e.g. I65VU7K5ZQL7WB4E"
              autoFocus={!isEditing}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm font-mono tracking-wider placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
            />
            <p className="mt-1 text-xs text-gray-500">
              Paste the secret key or an otpauth:// URI
            </p>
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Service Name
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g. GitHub, Google, Discord"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
            />
          </div>

          {/* Account / Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Account / Email
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. user@example.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
            />
          </div>

          {/* Advanced Settings (collapsed by default) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors duration-150"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 ${showAdvanced ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Advanced Settings
              {(algorithm !== 'SHA1' || digits !== 6 || period !== 30) && (
                <span className="text-emerald-500">(modified)</span>
              )}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Algorithm</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as TwoFactorAccount['algorithm'])}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                  >
                    <option value="SHA1">SHA-1</option>
                    <option value="SHA256">SHA-256</option>
                    <option value="SHA512">SHA-512</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Digits</label>
                  <select
                    value={digits}
                    onChange={(e) => setDigits(Number(e.target.value) as TwoFactorAccount['digits'])}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                  >
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Period (s)</label>
                  <input
                    type="number"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    min={1}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
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
