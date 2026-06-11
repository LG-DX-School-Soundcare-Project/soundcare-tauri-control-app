import mockHomeStatus from '../data/mockHomeStatus.json';
import { request, isMockApiEnabled } from './client.js';
import { defaultSensitiveAppliances, withApiFallback } from './fallbacks.js';

// MVP 계약:
// - sensitive_appliances: userRegisteredDeviceId 기준, 단일 dbThreshold + sensitivityLevel + reportInclusion
// - 정책은 /api/settings/appliance-control-policies (sensitiveApplianceId 기준)
// - confidenceThreshold / responsePolicy / notifyGuardian 제거

function normalizeSetting(item) {
  return {
    ...item,
    baseDbThreshold: item.baseDbThreshold ?? item.dbThreshold ?? 55,
    sensitivityLevel: item.sensitivityLevel ?? 3,
    includeInReport: item.includeInReport ?? item.reportInclusion ?? true,
    policies: item.policies ?? []
  };
}

function toBackendSetting(item) {
  return {
    userRegisteredDeviceId: item.userRegisteredDeviceId,
    serviceLabel: item.serviceLabel,
    enabled: item.enabled,
    dbThreshold: item.baseDbThreshold ?? item.dbThreshold,
    sensitivityLevel: item.sensitivityLevel ?? 3,
    reportInclusion: item.includeInReport ?? item.reportInclusion ?? true,
    policies: item.policies ?? [
      { policyType: 'NOTIFICATION', enabled: item.notificationMode !== 'DISABLED', policyJson: {} },
      { policyType: 'ROUTINE_RECOMMENDATION', enabled: true, policyJson: {} }
    ]
  };
}

export async function getSensitiveAppliances() {
  if (isMockApiEnabled()) {
    return mockHomeStatus.sensitiveAppliances.map(normalizeSetting);
  }
  const settings = await request('/api/settings/sensitive-appliances')
    .catch((error) => withApiFallback(error, defaultSensitiveAppliances, 'sensitive appliance settings'));
  return settings.map(normalizeSetting);
}

export async function saveSensitiveAppliances(settings) {
  if (isMockApiEnabled()) {
    window.localStorage.setItem('soundcare.sensitiveAppliances', JSON.stringify(settings));
    return { saved: true, settingsVersion: `local-${Date.now()}`, items: settings };
  }
  const saved = [];
  for (const item of settings) {
    if (item.sensitiveApplianceId) {
      const updated = await request(`/api/settings/sensitive-appliances/${encodeURIComponent(item.sensitiveApplianceId)}`, {
        method: 'PATCH',
        body: toBackendSetting(item)
      }).catch((error) => withApiFallback(error, () => item, 'update sensitive appliance setting'));
      saved.push(updated);
    } else {
      const created = await request('/api/settings/sensitive-appliances', {
        method: 'POST',
        body: toBackendSetting(item)
      }).catch((error) => withApiFallback(error, () => item, 'create sensitive appliance setting'));
      saved.push(created);
    }
  }
  return { saved: true, settingsVersion: new Date().toISOString(), items: saved.map(normalizeSetting) };
}

export async function getControlPolicies() {
  if (isMockApiEnabled()) {
    return mockHomeStatus.sensitiveAppliances.map((item) => ({
      serviceLabel: item.serviceLabel,
      policyType: 'NOTIFICATION',
      enabled: true
    }));
  }
  return request('/api/settings/appliance-control-policies')
    .catch((error) => withApiFallback(error, () => defaultSensitiveAppliances().map((item) => ({
      serviceLabel: item.serviceLabel,
      policyType: 'NOTIFICATION',
      enabled: true
    })), 'appliance control policies'));
}

export async function updateControlPolicy(policyId, policy) {
  if (isMockApiEnabled()) {
    return { policyId, ...policy, saved: true };
  }
  return request(`/api/settings/appliance-control-policies/${encodeURIComponent(policyId)}`, {
    method: 'PATCH',
    body: policy
  }).catch((error) => withApiFallback(error, () => ({ policyId, ...policy, saved: true }), 'update appliance control policy'));
}
