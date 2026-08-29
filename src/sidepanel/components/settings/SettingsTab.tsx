import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Sun,
  Moon,
  KeyRound,
  Lock,
  Fingerprint,
  ChevronRight,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { sendMessage } from '@shared/messages';
import type { UserSettings, ThemePreference, ListDensity } from '@shared/types';
import { useTheme } from '@hooks/useTheme';
import {
  isBiometricSupported,
  isBiometricEnrolled,
  enrollBiometric,
  disableBiometric,
} from '@shared/biometric';
import {
  Card,
  Button,
  Toggle,
  SegmentedControl,
  Input,
  Field,
  Modal,
  Spinner,
  cn,
} from '@shared/ui';
import PasswordChange from './PasswordChange';

// ── Auto-lock options ──────────────────────────────────────────────────

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 0, label: 'Never' },
];

const CLIPBOARD_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '10', label: '10s' },
  { value: '20', label: '20s' },
  { value: '30', label: '30s' },
  { value: '60', label: '60s' },
];

const DEFAULT_SETTINGS: UserSettings = {
  autoDetectQR: true,
  notifyNewMail: true,
  autoLockMinutes: 5,
  theme: 'system',
  clipboardClearSeconds: 0,
  biometricUnlock: false,
  listDensity: 'comfortable',
  pageIntegrationEnabled: false,
  blockRemoteMailContent: true,
};

// ── Small layout helpers ───────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-text-muted">
      {children}
    </h2>
  );
}

function Row({
  label,
  hint,
  control,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <p className="text-sm text-text">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [clearStep, setClearStep] = useState<'idle' | 'confirm' | 'type-delete'>('idle');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  // Biometric state
  const [bioSupported, setBioSupported] = useState<boolean | null>(null);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioBusy, setBioBusy] = useState(false);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sendMessage<{ settings?: UserSettings; error?: string }>({
        type: 'GET_SETTINGS',
      });
      setSettings({ ...DEFAULT_SETTINGS, ...(response.settings ?? {}) });
    } catch {
      // Use defaults
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Detect biometric support / enrollment on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const supported = await isBiometricSupported();
      if (!active) return;
      setBioSupported(supported);
      if (supported) {
        const enrolled = await isBiometricEnrolled();
        if (active) setBioEnrolled(enrolled);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Save a single setting immediately
  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings) return;

    const previous = settings;
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await sendMessage({ type: 'UPDATE_SETTINGS', settings: { [key]: value } });
    } catch {
      // Revert on failure
      setSettings(previous);
    }
  };

  // Appearance: theme is stored both outside the vault (applied instantly) and in settings.
  const handleThemeChange = (value: ThemePreference) => {
    setTheme(value);
    updateSetting('theme', value);
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

  // ── Biometric handlers ─────────────────────────────────────────────

  const handleBiometricToggle = async (next: boolean) => {
    setBioError(null);
    if (next) {
      // Enrolling requires the master password → prompt in a modal.
      setBioPassword('');
      setBioModalOpen(true);
      return;
    }
    // Turning off.
    setBioBusy(true);
    try {
      await disableBiometric();
      await sendMessage({ type: 'UPDATE_SETTINGS', settings: { biometricUnlock: false } });
      setBioEnrolled(false);
      setSettings((s) => (s ? { ...s, biometricUnlock: false } : s));
    } catch (err) {
      setBioError((err as Error).message);
    } finally {
      setBioBusy(false);
    }
  };

  const confirmBiometricEnroll = async () => {
    setBioError(null);
    if (!bioPassword) {
      setBioError('Enter your master password to continue.');
      return;
    }
    setBioBusy(true);
    try {
      const res = await sendMessage<{ valid?: boolean }>({
        type: 'VERIFY_PASSWORD',
        password: bioPassword,
      });
      if (!res.valid) {
        setBioError('Incorrect master password.');
        return;
      }
      await enrollBiometric(bioPassword);
      await sendMessage({ type: 'UPDATE_SETTINGS', settings: { biometricUnlock: true } });
      setBioEnrolled(true);
      setSettings((s) => (s ? { ...s, biometricUnlock: true } : s));
      setBioModalOpen(false);
      setBioPassword('');
    } catch (err) {
      setBioError((err as Error).message || 'Could not enable biometric unlock.');
    } finally {
      setBioBusy(false);
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
      <div className="flex h-full items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-base font-semibold text-text">Settings</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
        {/* ── Appearance ───────────────────────────────────────────── */}
        <section>
          <SectionHeader>Appearance</SectionHeader>
          <Card className="space-y-4">
            <Row
              label="Theme"
              hint="System follows your device setting."
              control={
                <SegmentedControl<ThemePreference>
                  value={theme}
                  onChange={handleThemeChange}
                  ariaLabel="Theme"
                  options={[
                    { value: 'system', icon: <Monitor size={15} /> },
                    { value: 'light', icon: <Sun size={15} /> },
                    { value: 'dark', icon: <Moon size={15} /> },
                  ]}
                />
              }
            />
            <Row
              label="List density"
              hint="How tightly accounts are packed."
              control={
                <SegmentedControl<ListDensity>
                  value={settings.listDensity}
                  onChange={(v) => updateSetting('listDensity', v)}
                  ariaLabel="List density"
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ]}
                />
              }
            />
          </Card>
        </section>

        {/* ── Behavior ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader>Behavior</SectionHeader>
          <Card className="space-y-4">
            <Row
              label="Auto-detect QR codes on pages"
              hint="Spot 2FA QR codes while you browse."
              control={
                <Toggle
                  checked={settings.autoDetectQR}
                  onChange={(v) => updateSetting('autoDetectQR', v)}
                  label="Auto-detect QR codes on pages"
                />
              }
            />
            <Row
              label="Notify on new emails"
              hint="Show a notification when mail arrives."
              control={
                <Toggle
                  checked={settings.notifyNewMail}
                  onChange={(v) => updateSetting('notifyNewMail', v)}
                  label="Notify on new emails"
                />
              }
            />
            <Row
              label="Auto-lock timeout"
              hint="Lock the vault after inactivity."
              control={
                <select
                  value={settings.autoLockMinutes}
                  onChange={(e) => updateSetting('autoLockMinutes', Number(e.target.value))}
                  className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                >
                  {AUTO_LOCK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              }
            />
          </Card>
        </section>

        {/* ── Security ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader>Security</SectionHeader>
          <Card className="space-y-4">
            <Row
              label="Clear clipboard after copy"
              hint="Wipe copied codes from the clipboard automatically."
              control={
                <SegmentedControl
                  size="sm"
                  value={String(settings.clipboardClearSeconds)}
                  onChange={(v) => updateSetting('clipboardClearSeconds', Number(v))}
                  ariaLabel="Clear clipboard after copy"
                  options={CLIPBOARD_OPTIONS}
                />
              }
            />

            <div>
              <Row
                label="Biometric quick unlock"
                hint={
                  bioSupported === false
                    ? 'Not available on this device.'
                    : 'Unlock with your fingerprint or device biometrics.'
                }
                control={
                  <Toggle
                    checked={bioEnrolled}
                    disabled={bioSupported !== true || bioBusy}
                    onChange={handleBiometricToggle}
                    label="Biometric quick unlock"
                  />
                }
              />
              {bioError && !bioModalOpen && (
                <p className="mt-1.5 text-xs text-danger">{bioError}</p>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <button
                onClick={() => setShowPasswordChange(true)}
                className="group flex w-full items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center gap-3 text-sm text-text">
                  <KeyRound size={16} className="text-text-secondary" />
                  Change master password
                </span>
                <ChevronRight size={16} className="text-text-muted" />
              </button>

              <button
                onClick={handleLockNow}
                className="group flex w-full items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center gap-3 text-sm text-text">
                  <Lock size={16} className="text-text-secondary" />
                  Lock now
                </span>
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            </div>
          </Card>
        </section>

        {/* ── Danger zone ──────────────────────────────────────────── */}
        <section>
          <SectionHeader>Danger zone</SectionHeader>
          <Card className="border-danger/40">
            {clearStep === 'idle' && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text">Clear all data</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Permanently deletes every 2FA and mail account. This can't be undone.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={handleClearAllData}>
                  Clear all
                </Button>
              </div>
            )}

            {clearStep === 'confirm' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-danger" />
                  <p className="text-sm text-text">
                    Are you sure? This will delete all 2FA accounts and mail accounts.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={cancelClear}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleClearAllData}>
                    Yes, continue
                  </Button>
                </div>
              </div>
            )}

            {clearStep === 'type-delete' && (
              <div className="space-y-3">
                <p className="text-sm text-text">
                  Type <span className="font-mono font-bold text-danger">DELETE</span> to confirm:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  invalid
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={cancelClear}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleClearAllData}
                    disabled={deleteConfirmText !== 'DELETE' || clearing}
                  >
                    <Trash2 size={14} />
                    {clearing ? 'Clearing...' : 'Delete everything'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && <PasswordChange onClose={() => setShowPasswordChange(false)} />}

      {/* Biometric enrollment Modal */}
      {bioModalOpen && (
        <Modal
          open
          onClose={() => {
            if (bioBusy) return;
            setBioModalOpen(false);
            setBioError(null);
          }}
          title="Enable biometric unlock"
          description="Confirm your master password to link biometric unlock on this device."
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setBioModalOpen(false);
                  setBioError(null);
                }}
                disabled={bioBusy}
              >
                Cancel
              </Button>
              <Button onClick={confirmBiometricEnroll} disabled={bioBusy}>
                {bioBusy ? 'Enabling...' : 'Enable'}
              </Button>
            </>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmBiometricEnroll();
            }}
            className="space-y-3"
          >
            <div className="flex items-start gap-2 rounded-md bg-accent-soft px-3 py-2 text-accent">
              <Fingerprint size={15} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Your password stays available as a fallback. You can turn this off anytime.
              </p>
            </div>
            <Field label="Master password" error={bioError ?? undefined}>
              <Input
                type="password"
                value={bioPassword}
                onChange={(e) => setBioPassword(e.target.value)}
                placeholder="Enter master password"
                invalid={!!bioError}
                autoFocus
              />
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
}
