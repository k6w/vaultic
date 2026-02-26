import { useState, useEffect, useCallback } from 'react';
import { useMail } from '@hooks/useMail';
import type { MailDomain } from '@shared/types';

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
      if (active.length > 0) {
        setSelectedDomain(active[0].domain);
      }
      if (active.length === 0 && result.length === 0) {
        setDomainError('Could not load mail domains. The service may be temporarily unavailable.');
      }
    } catch {
      setDomainError('Network error. Please check your connection and try again.');
    } finally {
      setLoadingDomains(false);
    }
  }, [getDomains]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const password = autoGenerate ? generatedPassword : customPassword;
  const fullAddress = username && selectedDomain ? `${username}@${selectedDomain}` : '';
  const isValid = username.length >= 3 && selectedDomain && password.length >= 6;

  const handleRegeneratePassword = () => {
    const newPw = generatePassword();
    setGeneratedPassword(newPw);
    setCopiedPassword(false);
  };

  const handleCopyPassword = useCallback(async (pw: string) => {
    try {
      await navigator.clipboard.writeText(pw);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      // Fallback
    }
  }, []);

  const handleCopyAddress = useCallback(async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
    } catch {
      // Fallback
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    setError(null);

    try {
      const account = await createAccount(fullAddress, password);
      if (account) {
        setSuccess({ address: account.address, password });
      }
    } catch {
      setError('Failed to create account. Please try a different username or try again later.');
    }
  };

  const handleDone = () => {
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Create Temp Email</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-150"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-emerald-600/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-center text-sm text-gray-300">Account created successfully!</p>

            {/* Email */}
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Email Address</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-white font-mono truncate">{success.address}</p>
                <button
                  onClick={() => handleCopyAddress(success.address)}
                  className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                  title="Copy address"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Password</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-white font-mono truncate">{success.password}</p>
                <button
                  onClick={() => handleCopyPassword(success.password)}
                  className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                  title="Copy password"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-400 text-center">
              Save this password! You need it to recover this account.
            </p>

            <button
              onClick={handleDone}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors duration-150"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {loadingDomains ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">
                  {domainError ?? 'No domains available at the moment.'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Please try again later.</p>
                <button
                  type="button"
                  onClick={fetchDomains}
                  className="mt-3 px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-800/30 rounded-lg transition-colors duration-150"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Username + Domain */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="username"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors duration-150"
                      minLength={3}
                      required
                    />
                    <span className="flex items-center text-gray-400 text-sm">@</span>
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors duration-150"
                    >
                      {domains.map((d) => (
                        <option key={d.id} value={d.domain}>
                          {d.domain}
                        </option>
                      ))}
                    </select>
                  </div>
                  {fullAddress && (
                    <p className="mt-1.5 text-xs text-gray-400">
                      Preview: <span className="text-emerald-400 font-mono">{fullAddress}</span>
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoGenerate(true)}
                        className={`text-xs px-2 py-0.5 rounded transition-colors duration-150 ${
                          autoGenerate
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        Auto-generate
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenerate(false)}
                        className={`text-xs px-2 py-0.5 rounded transition-colors duration-150 ${
                          !autoGenerate
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {autoGenerate ? (
                    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                      <code className="flex-1 text-sm text-white font-mono truncate">
                        {generatedPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(generatedPassword)}
                        className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                        title="Copy password"
                      >
                        {copiedPassword ? (
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
                      <button
                        type="button"
                        onClick={handleRegeneratePassword}
                        className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-150"
                        title="Regenerate"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="Enter password (min 6 characters)"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors duration-150"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-white transition-colors duration-150"
                      >
                        {showPassword ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}

                  <p className="mt-1.5 text-xs text-amber-400">
                    Save this password! You'll need it to recover this account.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
