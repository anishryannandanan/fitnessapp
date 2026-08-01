import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Branch } from '@/lib/types';
import type { UpdateBranchInput } from '@/lib/api';

interface EditBranchModalProps {
  branch: Branch;
  onSave: (id: string, data: UpdateBranchInput) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export function EditBranchModal({ branch, onSave, onClose, saving }: EditBranchModalProps) {
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address ?? '');
  const [phone, setPhone] = useState(branch.phone ?? '');
  const [email, setEmail] = useState(branch.email ?? '');
  const [timezone, setTimezone] = useState(branch.timezone ?? 'Asia/Kolkata');
  const [isActive, setIsActive] = useState(branch.isActive);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Branch name must be at least 2 characters.');
      return;
    }

    try {
      await onSave(branch.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        timezone: timezone.trim() || undefined,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branch');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-surface p-5 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Edit Branch</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Branch Code (read-only) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Branch Code</label>
            <input
              type="text"
              value={branch.code}
              disabled
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-muted opacity-60"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-name">Name</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-address">Address</label>
            <input
              id="edit-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-phone">Phone</label>
            <input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-email">Email</label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="branch@fitnessworld.in"
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted" htmlFor="edit-timezone">Timezone</label>
            <select
              id="edit-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-xl border bg-surface-2 px-3 py-2.5">
            <span className="text-sm font-medium text-text">Active</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-11 rounded-full transition ${isActive ? 'bg-primary' : 'bg-border'}`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-text transition hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg transition hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
