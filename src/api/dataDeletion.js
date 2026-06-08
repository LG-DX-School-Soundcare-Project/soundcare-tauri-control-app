import { isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';

export async function createDataDeletionRequest(body) {
  if (isMockApiEnabled()) {
    return {
      requestId: `delete-${Date.now()}`,
      scope: body.scope,
      status: body.confirmText === 'DELETE' ? 'COMPLETED' : 'FAILED',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      resultSummary: body.confirmText === 'DELETE'
        ? { logs: 'CLIENT_ACTION_REQUIRED' }
        : { error: 'confirmText must be DELETE' },
      metadata: body.metadata ?? {}
    };
  }
  return request('/api/data-deletion-requests', {
    method: 'POST',
    body
  }).catch((error) => withApiFallback(error, () => ({
    requestId: null,
    scope: body.scope,
    status: 'FAILED',
    requestedAt: new Date().toISOString(),
    resultSummary: { error: error.message },
    metadata: body.metadata ?? {}
  }), 'data deletion request'));
}

export async function fetchDataDeletionRequest(requestId) {
  if (isMockApiEnabled()) {
    return {
      requestId,
      scope: 'ALL',
      status: 'COMPLETED',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      resultSummary: { logs: 'CLIENT_ACTION_REQUIRED' },
      metadata: {}
    };
  }
  return request(`/api/data-deletion-requests/${encodeURIComponent(requestId)}`)
    .catch((error) => withApiFallback(error, () => null, 'data deletion request status'));
}
