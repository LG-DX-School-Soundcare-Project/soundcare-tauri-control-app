import { isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';
import { requestDetailedReport } from './reportApi.js';

export async function fetchReport(reportId) {
  if (isMockApiEnabled()) {
    return {
      reportId,
      reportType: 'DETAILED',
      reportText: 'Local mock report detail.',
      summary: {},
      status: 'ACTIVE'
    };
  }
  return request(`/api/reports/${encodeURIComponent(reportId)}`)
    .catch((error) => withApiFallback(error, () => null, 'report detail'));
}

export async function regenerateReport(reportId) {
  if (isMockApiEnabled() || !reportId) {
    return requestDetailedReport();
  }
  return request(`/api/reports/${encodeURIComponent(reportId)}/regenerate`, {
    method: 'POST'
  }).catch((error) => withApiFallback(error, () => requestDetailedReport(), 'regenerate report'));
}

export async function exportReport(reportId) {
  if (isMockApiEnabled()) {
    return {
      reportId,
      reportText: 'Local mock export.',
      summaryJson: {},
      exportedAt: new Date().toISOString()
    };
  }
  return request(`/api/reports/${encodeURIComponent(reportId)}/export`)
    .catch((error) => withApiFallback(error, () => ({
      reportId,
      reportText: '',
      summaryJson: {},
      exportedAt: new Date().toISOString()
    }), 'export report'));
}

export async function deleteReport(reportId) {
  if (isMockApiEnabled()) {
    return { reportId, status: 'DELETED' };
  }
  return request(`/api/reports/${encodeURIComponent(reportId)}`, {
    method: 'DELETE'
  }).catch((error) => withApiFallback(error, () => ({ reportId, status: 'DELETE_FAILED' }), 'delete report'));
}
