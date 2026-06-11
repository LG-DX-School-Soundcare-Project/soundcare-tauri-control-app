import mockHomeStatus from '../data/mockHomeStatus.json';
import { request, isMockApiEnabled } from './client.js';
import { defaultRoutineRecommendations, withApiFallback } from './fallbacks.js';

// MVP 기준: 루틴 적용/숨김은 routine_recommendations.status 업데이트로 단순 처리한다.
// (/api/routines/{id}/apply, /dismiss, /generate, routine_applications 삭제)

export async function getRoutineRecommendations() {
  if (isMockApiEnabled()) {
    return mockHomeStatus.routineRecommendations;
  }
  return request('/api/routines')
    .catch((error) => withApiFallback(error, defaultRoutineRecommendations, 'routine recommendations'));
}

async function updateRoutineStatus(routineId, status) {
  if (isMockApiEnabled()) {
    return { id: routineId, status };
  }
  return request(`/api/routines/${encodeURIComponent(routineId)}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH'
  }).then(() => ({ id: routineId, status }))
    .catch((error) => withApiFallback(error, () => ({ id: routineId, status }), `routine status ${status}`));
}

export async function applyRoutine(routineId) {
  return updateRoutineStatus(routineId, 'ACCEPTED');
}

export async function dismissRoutine(routineId) {
  return updateRoutineStatus(routineId, 'DISMISSED');
}
