import { useState } from 'react';
import { X, Loader2, CheckCircle2, KeyRound } from 'lucide-react';

interface ResetPasswordModalProps {
  staffName: string;
  onReset: (password: string) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
  success?: boolean;
}

export function ResetPasswordModal({ staffName, onReset, onClose, saving, success }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await onReset(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Reset Password</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={28} />
            </div>
            <p className="font-semibold text-text">Password Reset!</p>
            <p className="text-sm text-muted">
              The password for <span className="font-medium text-text">{staffName}</span> has been updated successfully.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2">
              <KeyRound size={16} className="text-warning" />
              <p className="text-xs text-warning">
                Setting a new password for <span className="font-semibold">{staffName}</span>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-text transition hover:bg-surface-2">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-warning py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
