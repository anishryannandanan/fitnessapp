import { API_URL, HAS_API } from './env';
import { useAuth } from '@/stores/auth';

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  avatarColor: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  staffProfile: {
    staffType: string;
    specialization: string | null;
    dateOfJoining: string | null;
  } | null;
  userBranches: Array<{
    branch: { id: string; name: string; code: string };
    isPrimary: boolean;
  }>;
}

export type UpdateStaffInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  staffType?: string;
  specialization?: string;
  isActive?: boolean;
};

// Mock data for demo mode
const MOCK_STAFF: StaffMember[] = [
  {
    id: 'u-mgr',
    fullName: 'Meera Nair',
    email: 'manager.kochi@fitnessworld.in',
    phone: '+919876543210',
    role: 'manager',
    isActive: true,
    avatarColor: '#3B82F6',
    lastLoginAt: null,
    createdAt: '2024-01-15',
    staffProfile: { staffType: 'manager', specialization: null, dateOfJoining: '2024-01-15' },
    userBranches: [{ branch: { id: 'b-kochi', name: 'Kochi', code: 'KCH' }, isPrimary: true }],
  },
  {
    id: 'u-rec',
    fullName: 'Anu Thomas',
    email: 'reception.kochi@fitnessworld.in',
    phone: '+919876543211',
    role: 'receptionist',
    isActive: true,
    avatarColor: '#F97316',
    lastLoginAt: null,
    createdAt: '2024-02-01',
    staffProfile: { staffType: 'receptionist', specialization: null, dateOfJoining: '2024-02-01' },
    userBranches: [{ branch: { id: 'b-kochi', name: 'Kochi', code: 'KCH' }, isPrimary: true }],
  },
  {
    id: 'u-trn',
    fullName: 'Vishnu R',
    email: 'vishnu@fitnessworld.in',
    phone: '+919876543212',
    role: 'trainer',
    isActive: true,
    avatarColor: '#A855F7',
    lastLoginAt: null,
    createdAt: '2024-02-15',
    staffProfile: { staffType: 'trainer', specialization: 'Strength & Conditioning', dateOfJoining: '2024-02-15' },
    userBranches: [{ branch: { id: 'b-kochi', name: 'Kochi', code: 'KCH' }, isPrimary: true }],
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getToken(): string {
  return useAuth.getState().token ?? '';
}

export async function getStaff(q?: string): Promise<StaffMember[]> {
  if (!HAS_API) {
    await delay(200);
    if (q) {
      const lower = q.toLowerCase();
      return MOCK_STAFF.filter(
        (s) => s.fullName.toLowerCase().includes(lower) || s.email.toLowerCase().includes(lower),
      );
    }
    return MOCK_STAFF;
  }

  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await fetch(`${API_URL}/api/v1/staff${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch staff');
  return res.json();
}

export async function updateStaff(id: string, data: UpdateStaffInput): Promise<StaffMember> {
  if (!HAS_API) {
    await delay(300);
    const staff = MOCK_STAFF.find((s) => s.id === id);
    if (!staff) throw new Error('Staff not found');
    Object.assign(staff, data);
    return { ...staff };
  }

  const res = await fetch(`${API_URL}/api/v1/staff/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update staff');
  return res.json();
}

export async function resetStaffPassword(id: string, newPassword: string): Promise<{ message: string }> {
  if (!HAS_API) {
    await delay(300);
    return { message: 'Password reset successfully' };
  }

  const res = await fetch(`${API_URL}/api/v1/staff/${id}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) throw new Error('Failed to reset password');
  return res.json();
}

export type CreateStaffInput = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  staffType: string;
  branchId: string;
  specialization?: string;
};

export async function createStaff(data: CreateStaffInput): Promise<StaffMember> {
  if (!HAS_API) {
    await delay(300);
    const newStaff: StaffMember = {
      id: `u-${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || null,
      role: data.staffType,
      isActive: true,
      avatarColor: '#16A34A',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      staffProfile: { staffType: data.staffType, specialization: data.specialization || null, dateOfJoining: new Date().toISOString() },
      userBranches: [{ branch: { id: data.branchId, name: 'Branch', code: 'BRN' }, isPrimary: true }],
    };
    MOCK_STAFF.push(newStaff);
    return newStaff;
  }

  const res = await fetch(`${API_URL}/api/v1/staff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to create staff');
  }
  return res.json();
}
