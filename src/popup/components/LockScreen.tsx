import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, AlertCircle, Clock, Fingerprint } from 'lucide-react';
import { sendMessage } from '@shared/messages';
import { isBiometricEnrolled, unlockWithBiometric } from '@shared/biometric';
import { Button, Input, Logo, cn } from '@shared/ui';

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode === 'unlock') {
      isBiometricEnrolled().then(setBiometricAvailable);
    }
  }, [mode]);

  const handleBiometricUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const pw = await unlockWithBiometric();
      const result = await sendMessage<{ success: boolean; error?: string }>({
        type: 'UNLOCK',
        password: pw,
      });
      if (result.success) onUnlocked();
      else setError(result.error ?? 'Biometric unlock failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biometric unlock failed');
    } finally {
      setLoading(false);
    }
  };

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

  const strength = mode === 'create' ? passwordStrength(password) : null;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-bg px-8">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft">
        <Logo size={34} showText={false} />
      </div>

      <h1 className="font-display text-xl font-semibold text-text">Vaultic</h1>
      <p className="mt-1 mb-7 text-sm text-text-secondary">
        {mode === 'create' ? 'Create your master password' : 'Enter your master password'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'create' ? 'Create password' : 'Master password'}
            className="pr-10"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {mode === 'create' && strength && password.length > 0 && (
          <div className="flex items-center gap-2 px-0.5">
            <div className="flex-1 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i < strength.score ? strength.barClass : 'bg-border-strong'
                  )}
                />
              ))}
            </div>
            <span className={cn('text-[11px] font-medium', strength.textClass)}>
              {strength.label}
            </span>
          </div>
        )}

        {mode === 'create' && (
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-danger">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {cooldownSeconds > 0 && (
          <div className="rounded-md bg-warning-soft px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <Clock size={13} /> Try again in {cooldownSeconds}s
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-warning transition-all duration-1000 ease-linear"
                style={{ width: `${(cooldownSeconds / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          block
          size="lg"
          disabled={loading || cooldownSeconds > 0}
          className="mt-1"
        >
          {loading
            ? 'Please wait…'
            : cooldownSeconds > 0
              ? `Locked (${cooldownSeconds}s)`
              : mode === 'create'
                ? 'Create vault'
                : 'Unlock'}
        </Button>

        {mode === 'unlock' && biometricAvailable && (
          <Button
            type="button"
            variant="secondary"
            block
            size="lg"
            disabled={loading}
            onClick={handleBiometricUnlock}
          >
            <Fingerprint size={17} /> Unlock with biometrics
          </Button>
        )}

        {mode === 'create' && (
          <p className="pt-1 text-center text-[11px] leading-relaxed text-text-muted">
            Your master password encrypts everything locally. It can't be recovered — store
            it somewhere safe.
          </p>
        )}
      </form>
    </div>
  );
}

function passwordStrength(pw: string): {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Weak', barClass: 'bg-danger', textClass: 'text-danger' },
    { label: 'Weak', barClass: 'bg-danger', textClass: 'text-danger' },
    { label: 'Fair', barClass: 'bg-warning', textClass: 'text-warning' },
    { label: 'Good', barClass: 'bg-accent', textClass: 'text-accent' },
    { label: 'Strong', barClass: 'bg-accent', textClass: 'text-accent' },
  ];
  return { score, ...levels[score] };
}
