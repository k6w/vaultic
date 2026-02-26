import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '@shared/messages';
import type { UserSettings } from '@shared/types';
import PasswordChange from './PasswordChange';

// ── Toggle Switch ──────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-emerald-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// ── Auto-lock options ──────────────────────────────────────────────────

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 0, label: 'Never' },
];

// ── Main Component ─────────────────────────────────────────────────────

export default function SettingsTab() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [clearStep, setClearStep] = useState<'idle' | 'confirm' | 'type-delete'>('idle');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sendMessage<{ settings?: UserSettings; error?: string }>({
        type: 'GET_SETTINGS',
      });
      if (response.settings) {
        setSettings(response.settings);
      }
    } catch {
      // Use defaults
      setSettings({
        autoDetectQR: true,
        notifyNewMail: true,
        autoLockMinutes: 5,
        theme: 'dark',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save a single setting immediately
  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings) return;

    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await sendMessage({ type: 'UPDATE_SETTINGS', settings: { [key]: value } });
    } catch {
      // Revert on failure
      setSettings(settings);
    }
  };

  // Lock now
  const handleLockNow = async () => {
    try {
      await sendMessage({ type: 'LOCK' });
      window.location.reload();
    } catch {
      // ignore
    }
  };

  // Clear all data
  const handleClearAllData = async () => {
    if (clearStep === 'idle') {
      setClearStep('confirm');
      return;
    }
    if (clearStep === 'confirm') {
      setClearStep('type-delete');
      return;
    }
    if (clearStep === 'type-delete') {
      if (deleteConfirmText !== 'DELETE') return;
      setClearing(true);
      try {
        await sendMessage({ type: 'CLEAR_ALL_DATA' });
        window.location.reload();
      } catch {
        setClearing(false);
        setClearStep('idle');
      }
    }
  };

  const cancelClear = () => {
    setClearStep('idle');
    setDeleteConfirmText('');
  };

  // Loading state
  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        {/* ── General ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            General
          </h2>
          <div className="space-y-4 p-4 rounded-lg bg-gray-900 border border-gray-700">
            <Toggle
              checked={settings.autoDetectQR}
              onChange={(v) => updateSetting('autoDetectQR', v)}
              label="Auto-detect QR codes on pages"
            />
            <Toggle
              checked={settings.notifyNewMail}
              onChange={(v) => updateSetting('notifyNewMail', v)}
              label="Notify on new emails"
            />

            {/* Auto-lock timeout */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Auto-lock timeout</span>
              <select
                value={settings.autoLockMinutes}
                onChange={(e) => updateSetting('autoLockMinutes', Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
              >
                {AUTO_LOCK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Security ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Security
          </h2>
          <div className="space-y-3 p-4 rounded-lg bg-gray-900 border border-gray-700">
            <button
              onClick={() => setShowPasswordChange(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-white transition-colors duration-150">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors duration-150">
                  Change Master Password
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button
              onClick={handleLockNow}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-white transition-colors duration-150">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                  <line x1="12" y1="16" x2="12" y2="16.01" />
                </svg>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors duration-150">
                  Lock Now
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </section>

        {/* ── Danger Zone ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <div className="p-4 rounded-lg bg-gray-900 border border-red-500/50">
            {clearStep === 'idle' && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Clear All Data</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Permanently delete all accounts and settings
                  </p>
                </div>
                <button
                  onClick={handleClearAllData}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors duration-150"
                >
                  Clear All
                </button>
              </div>
            )}

            {clearStep === 'confirm' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="text-sm text-red-300">
                    Are you sure? This will delete all 2FA accounts and mail accounts.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelClear}
                    className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllData}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors duration-150"
                  >
                    Yes, Continue
                  </button>
                </div>
              </div>
            )}

            {clearStep === 'type-delete' && (
              <div className="space-y-3">
                <p className="text-sm text-red-300">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-gray-800 border border-red-500/50 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors duration-150"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelClear}
                    className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllData}
                    disabled={deleteConfirmText !== 'DELETE' || clearing}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
                  >
                    {clearing ? 'Clearing...' : 'Delete Everything'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChange onClose={() => setShowPasswordChange(false)} />
      )}
    </div>
  );
}
