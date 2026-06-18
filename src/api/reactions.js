import { buildQuery, isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';

// 시연용 풍부한 반응 데이터.
// 스토리보드 의도에 맞춰: 세탁기 불편 비율↑(~76%), 로봇청소기 개선(부정 ~38%),
// 불편 반응은 저녁(18~24시)에 집중, 최근 3일 이내로 분포시킨다.
export function defaultReactionHistory() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const out = [];
  let i = 0;
  const at = (dayAgo, hour) => {
    const d = new Date(now - dayAgo * DAY);
    d.setHours(hour, (i * 7) % 60, 0, 0);
    return d.toISOString();
  };
  const push = (serviceLabel, modelLabel, roomName, type, db, dayAgo, hour) => {
    i += 1;
    out.push({
      reactionId: `reaction-demo-${String(i).padStart(3, '0')}`,
      noiseEventId: type === 'NEGATIVE' ? `event-demo-${i}` : null,
      createdAt: at(dayAgo, hour),
      reactionType: type,
      intensity: type === 'NEGATIVE' ? 4 : 3,
      memo: null,
      status: serviceLabel === 'manual' ? 'MANUAL' : 'LINKED',
      source: serviceLabel === 'manual' ? 'MANUAL_INPUT' : 'USER_TAP',
      roomName,
      modelLabel,
      serviceLabel,
      decibelAvg: db
    });
  };

  // 세탁기: 불편 16(저녁 집중) + 만족 5  → 불편 비율 약 76%
  [19, 20, 21, 22, 20, 21, 19, 23, 20, 22, 18, 21, 20, 19, 22, 21]
    .forEach((h, k) => push('washing_machine', 'washing_machine', '세탁실', 'NEGATIVE', 68 + (k % 5), k % 3, h));
  [14, 15, 11, 13, 16]
    .forEach((h, k) => push('washing_machine', 'washing_machine', '세탁실', 'POSITIVE', 60 + (k % 4), k % 3, h));

  // 로봇청소기: 불편 5 + 만족 8 → 불편 비율 약 38% (저소음 모드 적용 후 개선)
  [20, 13, 21, 15, 19]
    .forEach((h, k) => push('robot_vacuum', 'vacuum_cleaner', '거실', 'NEGATIVE', 62 + (k % 4), k % 3, h));
  [10, 11, 14, 9, 12, 15, 16, 13]
    .forEach((h, k) => push('robot_vacuum', 'vacuum_cleaner', '거실', 'POSITIVE', 58 + (k % 5), k % 3, h));

  // 식기세척기: 불편 3 + 만족 4
  [21, 20, 22].forEach((h, k) => push('dishwasher', 'dishwasher', '주방', 'NEGATIVE', 51 + (k % 3), k % 3, h));
  [13, 19, 14, 20].forEach((h, k) => push('dishwasher', 'dishwasher', '주방', 'POSITIVE', 50 + (k % 3), k % 3, h));

  // 냉장고: 불편 1 + 만족 3
  push('refrigerator', 'refrigerator', '주방', 'NEGATIVE', 47, 1, 23);
  [9, 12, 18].forEach((h, k) => push('refrigerator', 'refrigerator', '주방', 'POSITIVE', 45 + (k % 2), k % 3, h));

  // 수동 입력: 불편 2
  push('manual', 'unknown', '침실', 'NEGATIVE', null, 0, 21);
  push('manual', 'unknown', '침실', 'NEGATIVE', null, 1, 22);

  return out;
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

// 버튼을 누른 그 순간, 측정 중인 모든 가전별로 반응을 한 번에 기록한다.
// 서버가 가전별 최신 측정값을 스냅샷하므로 본문에는 반응 종류/강도/메모만 보낸다.
export async function createReactionSnapshot({ reactionType, intensity, memo } = {}) {
  if (isMockApiEnabled()) {
    // 데모: 버튼을 누르면 측정 중인 가전 3건이 기록된 것처럼 보여준다.
    return {
      reactionId: `snapshot-${Date.now()}`,
      status: 'LINKED',
      source: 'USER_TAP',
      createdAt: new Date().toISOString(),
      reactionType,
      intensity,
      memo,
      count: 3
    };
  }
  return request('/api/events/reactions/snapshot', {
    method: 'POST',
    body: { reactionType, intensity, memo, source: 'USER_TAP' }
  });
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
