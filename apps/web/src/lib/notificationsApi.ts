import { apiFetch } from './authApi';

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export function fetchNotifications(token: string): Promise<ApiNotification[]> {
  return apiFetch<ApiNotification[]>('/api/v1/notifications', token);
}

export function fetchUnreadCount(token: string): Promise<{ count: number }> {
  return apiFetch<{ count: number }>('/api/v1/notifications/unread-count', token);
}

export function markNotificationRead(token: string, id: string): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(`/api/v1/notifications/${id}/read`, token, { method: 'POST' });
}

export function markAllNotificationsRead(token: string): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>('/api/v1/notifications/read-all', token, { method: 'POST' });
}
