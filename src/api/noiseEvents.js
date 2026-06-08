import { buildQuery, isMockApiEnabled, request } from './client.js';
import { defaultNoiseEvents, withApiFallback } from './fallbacks.js';

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

export async function fetchNoiseEvents(params = {}) {
  if (isMockApiEnabled()) {
    const items = defaultNoiseEvents();
    return normalizePage(items, items);
  }
  const fallbackItems = defaultNoiseEvents();
  const response = await request(`/api/events/noise${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, () => normalizePage(fallbackItems, fallbackItems), 'noise event history'));
  return normalizePage(response, fallbackItems);
}

export async function fetchNoiseEventDetail(eventId) {
  if (isMockApiEnabled()) {
    const event = defaultNoiseEvents().find((item) => item.eventId === eventId || item.id === eventId) ?? defaultNoiseEvents()[0];
    return { ...event, eventId: event.eventId ?? event.id, reactions: [] };
  }
  return request(`/api/events/noise/${encodeURIComponent(eventId)}`)
    .catch((error) => withApiFallback(error, () => null, 'noise event detail'));
}
