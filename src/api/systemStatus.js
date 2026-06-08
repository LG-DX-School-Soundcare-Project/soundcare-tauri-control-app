import { isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';

export function defaultSystemStatus() {
  return {
    overallStatus: 'DEGRADED',
    backend: { status: 'OK', apiAvailable: true, latencyMs: 124 },
    agent: { status: 'OFFLINE', lastSeenAt: null },
    uploadQueue: { status: 'WARN', serverRecentNoiseUploads: 0, clientQueueVisibility: 'LOCAL_ONLY' },
    sensor: { status: 'STALE', lastEventAt: null },
    model: { status: 'OK', recentClassificationCount: 0, rawAudioAccepted: false },
    recentErrors: [
      { source: 'Upload queue', message: 'Retry pending', state: 'WARNING', created_at: new Date().toISOString() }
    ]
  };
}

export async function fetchSystemStatus() {
  if (isMockApiEnabled()) {
    return defaultSystemStatus();
  }
  return request('/api/system/status')
    .catch((error) => withApiFallback(error, defaultSystemStatus, 'system status'));
}
