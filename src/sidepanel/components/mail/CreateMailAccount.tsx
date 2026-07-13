import { useState, useEffect, useCallback } from 'react';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useMail } from '@hooks/useMail';
import type { MailDomain } from '@shared/types';
import {
  Modal,
  Button,
  IconButton,
  Input,
  Field,
  Spinner,
  SegmentedControl,
  cn,
} from '@shared/ui';

interface CreateMailAccountProps {
  onClose: () => void;
  onCreated: () => void;
}

function generatePassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export default function CreateMailAccount({ onClose, onCreated }: CreateMailAccountProps) {
  const { getDomains, createAccount, loading, error, setError } = useMail();
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState(() => generatePassword());
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [success, setSuccess] = useState<{ address: string; password: string } | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoadingDomains(true);
    setDomainError(null);
    try {
      const result = await getDomains();
      const active = result.filter((d) => d.isActive);
      setDomains(active);
      if (active.length > 0) setSelectedDomain(active[0].domain);
      if (active.length === 0 && result.length === 0) {
        setDomainError('Could not load mail domains. Service may be unavailable.');
      }
    } catch {
      setDomainError('Network error. Check your connection.');
    } finally {
      setLoadingDomains(false);
    }
  }, [getDomains]);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  const password = autoGenerate ? generatedPassword : customPassword;
  const fullAddress = username && selectedDomain ? `${username}@${selectedDomain}` : '';
  const isValid = username.length >= 3 && selectedDomain && password.length >= 6;

  const handleRegeneratePassword = () => {
    setGeneratedPassword(generatePassword());
    setCopiedPassword(false);
  };

  const handleCopyPassword = useCallback(async (pw: string) => {
    try {
      await navigator.clipboard.writeText(pw);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch { /* ignore */ }
  }, []);

  const handleCopyAddress = useCallback(async (addr: string) => {
    try { await navigator.clipboard.writeText(addr); } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    setError(null);
    try {
      const account = await createAccount(fullAddress, password);
      if (account) setSuccess({ address: account.address, password });
    } catch {
      setError('Failed to create account. Try a different username.');
    }
  };

  const handleDone = () => { onCreated(); onClose(); };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={success ? 'Account Created' : 'Create Temp Email'}
    >
      {success ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-accent-soft">
            <Check size={22} className="text-accent" />
          </div>
          <p className="text-center text-sm text-text-secondary">Your disposable inbox is ready.</p>

          <div className="bg-surface-2 rounded-md p-3">
            <p className="text-[11px] text-text-muted mb-1">Email</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-text font-mono truncate">{success.address}</p>
              <IconButton label="Copy email" size="sm" onClick={() => handleCopyAddress(success.address)}>
                <Copy size={14} />
              </IconButton>
            </div>
          </div>

          <div className="bg-surface-2 rounded-md p-3">
            <p className="text-[11px] text-text-muted mb-1">Password</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-text font-mono truncate">{success.password}</p>
              <IconButton label="Copy password" size="sm" onClick={() => handleCopyPassword(success.password)}>
                {copiedPassword ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
              </IconButton>
            </div>
          </div>

          <p className="text-[11px] text-warning text-center">Save this password to recover this account.</p>

          <Button block onClick={handleDone}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingDomains ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size={22} />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-text-secondary">{domainError ?? 'No domains available.'}</p>
              <Button type="button" variant="soft" size="sm" className="mt-3" onClick={fetchDomains}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Username + Domain */}
              <Field
                label="Email Address"
                hint={fullAddress || undefined}
              >
                <div className="flex items-stretch">
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="username"
                    className="flex-1 min-w-0 rounded-r-none"
                    minLength={3}
                    required
                  />
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="flex-shrink-0 h-10 bg-surface-2 border border-l-0 border-border text-text rounded-md rounded-l-none px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors duration-150"
                  >
                    {domains.map((d) => (
                      <option key={d.id} value={d.domain}>@{d.domain}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-text-secondary">Password</label>
                  <SegmentedControl
                    size="sm"
                    ariaLabel="Password mode"
                    value={autoGenerate ? 'auto' : 'custom'}
                    onChange={(v) => setAutoGenerate(v === 'auto')}
                    options={[
                      { value: 'auto', label: 'Auto' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                  />
                </div>

                {autoGenerate ? (
                  <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-md px-3 h-10">
                    <code className="flex-1 text-sm text-text font-mono truncate">{generatedPassword}</code>
                    <IconButton label="Copy password" size="sm" onClick={() => handleCopyPassword(generatedPassword)}>
                      {copiedPassword ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                    </IconButton>
                    <IconButton label="Regenerate password" size="sm" onClick={handleRegeneratePassword}>
                      <RefreshCw size={14} />
                    </IconButton>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="pr-10"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text transition-colors duration-150"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                )}

                <p className={cn('text-[11px] text-warning')}>Save this password to recover the account.</p>
              </div>

              {error && (
                <div className="bg-danger-soft border border-border rounded-md px-3 py-2">
                  <p className="text-xs text-danger">{error}</p>
                </div>
              )}

              <Button type="submit" block disabled={!isValid || loading}>
                {loading ? (
                  <>
                    <Spinner size={14} className="[border-color:currentColor] [border-right-color:transparent]" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}
