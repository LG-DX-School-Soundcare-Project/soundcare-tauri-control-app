import { isMockApiEnabled, request } from './client.js';
import { withApiFallback } from './fallbacks.js';

export async function withdrawGptConsent(body = {}) {
  if (isMockApiEnabled()) {
    return {
      consentType: body.consentType ?? 'GPT_DETAILED_REPORT',
      granted: false,
      revokedAt: new Date().toISOString(),
      reason: body.reason ?? null
    };
  }
  return request('/api/ai-consents/withdraw', {
    method: 'POST',
    body: {
      consentType: body.consentType ?? 'GPT_DETAILED_REPORT',
      reason: body.reason ?? null
    }
  }).catch((error) => withApiFallback(error, () => ({
    consentType: 'GPT_DETAILED_REPORT',
    granted: false,
    revokedAt: new Date().toISOString()
  }), 'GPT consent withdrawal'));
}
