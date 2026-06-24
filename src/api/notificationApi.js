import mockHomeStatus from '../data/mockHomeStatus.json';
import { request, isMockApiEnabled, isDemoMode, buildQuery, API_BASE_URL } from './client.js';
import { defaultNotifications, withApiFallback } from './fallbacks.js';

// 데모 웹 쇼케이스에서는 알림 종(UI)은 그대로 두되, 알림이 하나도 "뜨지" 않도록
// 목록/뱃지를 항상 비워 둔다. (다른 데모/실행 모드에는 영향 없음)
export async function getRecentNotifications(limit = 5) {
  if (isDemoMode()) {
    return [];
  }
  if (isMockApiEnabled()) {
    return mockHomeStatus.notifications.slice(0, limit);
  }
  return request(`/api/notifications/recent${buildQuery({ limit })}`)
    .catch((error) => withApiFallback(error, () => defaultNotifications().slice(0, limit), 'recent notifications'));
}

export async function getNotifications(params = {}) {
  if (isDemoMode()) {
    return [];
  }
  if (isMockApiEnabled()) {
    return mockHomeStatus.notifications;
  }
  return request(`/api/notifications${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, defaultNotifications, 'notifications'));
}

export async function markNotificationRead(notificationId) {
  if (isMockApiEnabled()) {
    return { id: notificationId, read: true };
  }
  return request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH'
  }).catch((error) => withApiFallback(error, () => ({ id: notificationId, read: true }), 'mark notification read'));
}

export function openNotificationWebSocket(onMessage) {
  // TODO: 백엔드 WebSocket 엔드포인트가 확정되면 인증 헤더 또는 query token 방식을 맞춘다.
  const url = API_BASE_URL.replace(/^http/, 'ws') + '/ws/notifications';
  const socket = new WebSocket(url);
  socket.addEventListener('message', (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      onMessage({ type: 'UNKNOWN', raw: event.data });
    }
  });
  return socket;
}
