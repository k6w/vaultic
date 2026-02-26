import { useState, useEffect, useRef } from 'react';
import { sendMessage } from '@shared/messages';

interface LockScreenProps {
  mode: 'create' | 'unlock';
  onUnlocked: () => void;
}

export default function LockScreen({ mode, onUnlocked }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldownSeconds > 0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === 'create') {
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const initResult = await sendMessage<{ success?: boolean; error?: string }>({
          type: 'INIT_VAULT',
          password,
        });

        if (initResult.error) {
          setError(initResult.error);
          setLoading(false);
          return;
        }

        // INIT_VAULT already unlocks, but call UNLOCK to be safe
        const unlockResult = await sendMessage<{ success: boolean; error?: string }>({
          type: 'UNLOCK',
          password,
        });

        if (unlockResult.success) {
          onUnlocked();
        } else {
          setError(unlockResult.error ?? 'Failed to unlock vault');
        }
      } else {
        const result = await sendMessage<{ success: boolean; error?: string }>({
          type: 'UNLOCK',
          password,
        });

        if (result.success) {
          onUnlocked();
        } else {
          // Parse cooldown from error message (e.g. "Too many attempts. Try again in 28 seconds.")
          const cooldownMatch = result.error?.match(/Try again in (\d+) seconds/);
          if (cooldownMatch) {
            setCooldownSeconds(parseInt(cooldownMatch[1], 10));
          }
          setError(result.error ?? 'Wrong password');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection error. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 px-8">
      {/* Shield Icon */}
      <div className="mb-6">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          className="text-emerald-500"
        >
          <path
            d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            fill="currentColor"
            opacity="0.15"
          />
          <path
            d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-white mb-1">2FA Manager</h1>
      <p className="text-sm text-gray-400 mb-8">
        {mode === 'create' ? 'Create Master Password' : 'Enter Master Password'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        {/* Password input */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'create' ? 'Create password' : 'Master password'}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 pr-10 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-150"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Confirm password (create mode only) */}
        {mode === 'create' && (
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 pr-10 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-150"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-150"
              tabIndex={-1}
            >
              {showConfirm ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs text-center">{error}</p>
          </div>
        )}

        {/* Cooldown timer */}
        {cooldownSeconds > 0 && (
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg px-3 py-2">
            <p className="text-amber-400 text-xs text-center">
              Try again in {cooldownSeconds}s
            </p>
            <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500/60 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(cooldownSeconds / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || cooldownSeconds > 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {loading
            ? 'Please wait...'
            : cooldownSeconds > 0
              ? `Locked (${cooldownSeconds}s)`
              : mode === 'create'
                ? 'Create Vault'
                : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
