import mockHomeStatus from '../data/mockHomeStatus.json';
import { request, isMockApiEnabled } from './client.js';
import { defaultRoutineRecommendations, withApiFallback } from './fallbacks.js';

export async function getRoutineRecommendations() {
  if (isMockApiEnabled()) {
    return mockHomeStatus.routineRecommendations;
  }
  return request('/api/routines/recommendations')
    .catch((error) => withApiFallback(error, defaultRoutineRecommendations, 'routine recommendations'));
}

export async function generateRoutineRecommendations() {
  if (isMockApiEnabled()) {
    return { created: 1, items: mockHomeStatus.routineRecommendations };
  }
  return request('/api/routines/generate', { method: 'POST' })
    .catch((error) => withApiFallback(error, () => ({
      created: defaultRoutineRecommendations().length,
      items: defaultRoutineRecommendations()
    }), 'generate routine recommendations'));
}

export async function applyRoutine(routineId) {
  if (isMockApiEnabled()) {
    return { id: routineId, status: 'APPLIED' };
  }
  return request(`/api/routines/${encodeURIComponent(routineId)}/apply`, { method: 'POST' })
    .catch((error) => withApiFallback(error, () => ({ id: routineId, status: 'APPLIED' }), 'apply routine'));
}

export async function dismissRoutine(routineId) {
  if (isMockApiEnabled()) {
    return { id: routineId, status: 'DISMISSED' };
  }
  return request(`/api/routines/${encodeURIComponent(routineId)}/dismiss`, { method: 'POST' })
    .catch((error) => withApiFallback(error, () => ({ id: routineId, status: 'DISMISSED' }), 'dismiss routine'));
}
