import { API_URL } from './env';
import type { Role, User } from './types';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    branchId: string | null;
    avatarColor: string | null;
  };
}

export interface Session {
  token: string;
  refreshToken: string;
  user: User;
}

/** Calls POST /api/v1/auth/login on the backend. */
export async function apiLogin(email: string, password: string): Promise<Session> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let message = 'Login failed';
    try {
      const body = await res.json();
      message = body?.message ?? body?.error?.message ?? message;
    } catch {
      /* ignore parse errors */
    }
    if (res.status === 401) message = 'Invalid email or password';
    throw new Error(message);
  }

  const data = (await res.json()) as LoginResponse;
  return {
    token: data.accessToken,
    refreshToken: data.refreshToken,
    user: {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      branchId: data.user.branchId,
      avatarColor: data.user.avatarColor ?? '#16A34A',
    },
  };
}

/** Authenticated fetch helper — attaches the bearer token. */
export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}
