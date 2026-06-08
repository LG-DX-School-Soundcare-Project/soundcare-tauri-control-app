import { buildQuery, isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';

export function defaultReactionHistory() {
  return [
    {
      reactionId: 'reaction-demo-001',
      noiseEventId: 'event-demo-001',
      createdAt: new Date().toISOString(),
      reactionType: 'POSITIVE',
      intensity: 3,
      memo: 'Linked demo reaction',
      status: 'LINKED',
      source: 'USER_TAP',
      roomName: 'Living',
      modelLabel: 'vacuum_cleaner',
      serviceLabel: 'robot_vacuum',
      decibelAvg: 71
    },
    {
      reactionId: 'reaction-demo-002',
      noiseEventId: null,
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      reactionType: 'NEGATIVE',
      intensity: 4,
      memo: 'Manual context',
      status: 'MANUAL',
      source: 'MANUAL_INPUT',
      roomName: 'Bedroom',
      modelLabel: 'unknown',
      serviceLabel: 'manual',
      decibelAvg: null
    }
  ];
}

function normalizePage(response, fallbackItems) {
  if (Array.isArray(response)) {
    return { items: response, page: 0, size: response.length, total: response.length };
  }
  return {
    items: response?.items ?? fallbackItems,
    page: response?.page ?? 0,
    size: response?.size ?? fallbackItems.length,
    total: response?.total ?? fallbackItems.length
  };
}

export async function fetchReactions(params = {}) {
  if (isMockApiEnabled()) {
    const items = defaultReactionHistory();
    return normalizePage(items, items);
  }
  const fallbackItems = defaultReactionHistory();
  const response = await request(`/api/events/reactions${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, () => normalizePage(fallbackItems, fallbackItems), 'reaction history'));
  return normalizePage(response, fallbackItems);
}

export async function fetchReactionDetail(reactionId) {
  if (isMockApiEnabled()) {
    return defaultReactionHistory().find((item) => item.reactionId === reactionId) ?? defaultReactionHistory()[0];
  }
  return request(`/api/events/reactions/${encodeURIComponent(reactionId)}`)
    .catch((error) => withApiFallback(error, () => null, 'reaction detail'));
}

export async function createManualReaction(body) {
  if (isMockApiEnabled()) {
    return {
      reactionId: `manual-${Date.now()}`,
      noiseEventId: null,
      status: 'MANUAL',
      source: 'MANUAL_INPUT',
      createdAt: new Date().toISOString(),
      ...body
    };
  }
  return request('/api/events/reactions/manual', {
    method: 'POST',
    body
  }).catch((error) => withApiFallback(error, () => ({ status: 'MANUAL', source: 'MANUAL_INPUT', ...body }), 'manual reaction'));
}
