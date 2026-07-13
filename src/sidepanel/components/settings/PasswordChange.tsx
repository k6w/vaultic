import { useState } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { sendMessage } from '@shared/messages';
import { Modal, Button, Field, Input, IconButton } from '@shared/ui';

interface PasswordChangeProps {
  onClose: () => void;
}

export default function PasswordChange({ onClose }: PasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (!currentPassword) return 'Current password is required';
    if (!newPassword) return 'New password is required';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    if (currentPassword === newPassword) return 'New password must differ from current password';
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
      const response = await sendMessage<{ success?: boolean; error?: string }>({
        type: 'CHANGE_PASSWORD',
        currentPassword,
        newPassword,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(true);
      // Lock and force re-auth after a short delay
      setTimeout(async () => {
        await sendMessage({ type: 'LOCK' });
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const RevealButton = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <IconButton
      type="button"
      label={show ? 'Hide password' : 'Show password'}
      size="sm"
      onClick={onToggle}
      className="absolute right-1 top-1/2 -translate-y-1/2"
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </IconButton>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Change master password"
      description="You'll be signed out and asked to unlock with your new password."
      size="sm"
      footer={
        success ? undefined : (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="password-change-form" disabled={saving}>
              {saving ? 'Changing...' : 'Change password'}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 size={44} className="mb-3 text-accent" />
          <p className="text-sm font-medium text-text">Password changed successfully</p>
          <p className="mt-1 text-xs text-text-secondary">Locking vault...</p>
        </div>
      ) : (
        <form id="password-change-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Current password">
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-11"
                placeholder="Enter current password"
              />
              <RevealButton show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
            </div>
          </Field>

          <Field
            label="New password"
            hint={
              newPassword && newPassword.length < 8
                ? `${8 - newPassword.length} more character${8 - newPassword.length !== 1 ? 's' : ''} needed`
                : undefined
            }
          >
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-11"
                placeholder="Min. 8 characters"
              />
              <RevealButton show={showNew} onToggle={() => setShowNew(!showNew)} />
            </div>
          </Field>

          <Field
            label="Confirm new password"
            error={
              confirmPassword && newPassword !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
          >
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-11"
                placeholder="Re-enter new password"
              />
              <RevealButton show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
            </div>
          </Field>

          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
