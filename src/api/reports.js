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

// MVP 기준: report export API는 삭제되었다.
// 클라이언트에서 리포트 본문을 조회해 로컬 저장용으로만 반환한다.
export async function exportReport(reportId) {
  const report = await fetchReport(reportId);
  return {
    reportId,
    reportText: report?.reportText ?? '',
    summaryJson: report?.summary ?? {},
    exportedAt: new Date().toISOString(),
    localOnly: true
  };
}

// MVP 기준: report delete API는 삭제되었다. 로컬 안내만 반환한다.
export async function deleteReport(reportId) {
  return { reportId, status: 'NOT_SUPPORTED_IN_MVP' };
}
