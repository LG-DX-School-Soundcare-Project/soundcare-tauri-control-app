import { isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';

// MVP 기준: ai_consents 테이블/API는 삭제되었고,
// GPT 동의는 users.ai_data_use_consent 컬럼으로 관리한다 (PATCH /api/users/me).

export async function withdrawGptConsent(body = {}) {
  if (isMockApiEnabled()) {
    return {
      consentType: body.consentType ?? 'GPT_DETAILED_REPORT',
      granted: false,
      revokedAt: new Date().toISOString(),
      reason: body.reason ?? null
    };
  }
  return request('/api/users/me', {
    method: 'PATCH',
    body: { aiDataUseConsent: false }
  }).then(() => ({
    consentType: 'GPT_DETAILED_REPORT',
    granted: false,
    revokedAt: new Date().toISOString(),
    reason: body.reason ?? null
  })).catch((error) => withApiFallback(error, () => ({
    consentType: 'GPT_DETAILED_REPORT',
    granted: false,
    revokedAt: new Date().toISOString()
  }), 'GPT consent withdrawal'));
}
