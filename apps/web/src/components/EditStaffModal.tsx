import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { StaffMember, UpdateStaffInput } from '@/lib/staffApi';

interface EditStaffModalProps {
  staff: StaffMember;
  onSave: (id: string, data: UpdateStaffInput) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export function EditStaffModal({ staff, onSave, onClose, saving }: EditStaffModalProps) {
  const [fullName, setFullName] = useState(staff.fullName);
  const [email, setEmail] = useState(staff.email);
  const [phone, setPhone] = useState(staff.phone ?? '');
  const [staffType, setStaffType] = useState(staff.staffProfile?.staffType ?? staff.role);
  const [specialization, setSpecialization] = useState(staff.staffProfile?.specialization ?? '');
  const [isActive, setIsActive] = useState(staff.isActive);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    try {
      await onSave(staff.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        staffType,
        specialization: specialization.trim() || undefined,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Edit Staff</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Staff Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Role / Type</label>
            <select
              value={staffType}
              onChange={(e) => setStaffType(e.target.value)}
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="manager">Manager</option>
              <option value="receptionist">Receptionist</option>
              <option value="trainer">Trainer</option>
              <option value="dietician">Dietician</option>
              <option value="cleaner">Cleaner</option>
              <option value="sales">Sales</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Specialization */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Specialization</label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Strength & Conditioning"
              className="w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-xl border bg-surface-2 px-3 py-2.5">
            <span className="text-sm font-medium text-text">Active</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-11 rounded-full transition ${isActive ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
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
