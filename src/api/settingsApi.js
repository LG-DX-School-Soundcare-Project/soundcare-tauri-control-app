import mockHomeStatus from '../data/mockHomeStatus.json';
import { request, isMockApiEnabled } from './client.js';
import { defaultSensitiveAppliances, withApiFallback } from './fallbacks.js';

function normalizeSetting(item) {
  return {
    ...item,
    baseDbThreshold: item.baseDbThreshold ?? item.dbThresholdAvg ?? 55,
    responseDbThreshold: item.responseDbThreshold ?? item.dbThresholdMax ?? 70,
    automaticResponseMode: item.automaticResponseMode ?? item.automaticControlPolicy ?? item.responsePolicy ?? 'NOTIFY_ONLY',
    notificationMode: item.notificationMode ?? item.responsePolicy ?? 'IMMEDIATE'
  };
}

function toBackendSetting(item) {
  return {
    serviceLabel: item.serviceLabel,
    displayName: item.displayName,
    enabled: item.enabled,
    dbThresholdAvg: item.baseDbThreshold,
    dbThresholdMax: item.responseDbThreshold,
    confidenceThreshold: item.confidenceThreshold,
    responsePolicy: item.notificationMode || 'IMMEDIATE',
    automaticControlEnabled: item.automaticResponseMode !== 'DISABLED',
    automaticControlPolicy: item.automaticResponseMode || 'NOTIFY_ONLY',
    notifyUser: item.notificationMode !== 'SUMMARY',
    includeInReport: item.includeInReport
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
  const saved = await request('/api/settings/sensitive-appliances', {
    method: 'PUT',
    body: settings.map(toBackendSetting)
  }).catch((error) => withApiFallback(error, () => settings, 'save sensitive appliance settings'));
  return { saved: true, settingsVersion: new Date().toISOString(), items: saved.map(normalizeSetting) };
}

export async function getControlPolicies() {
  if (isMockApiEnabled()) {
    return mockHomeStatus.sensitiveAppliances.map((item) => ({
      serviceLabel: item.serviceLabel,
      automaticResponseMode: item.automaticResponseMode,
      responseDbThreshold: item.responseDbThreshold
    }));
  }
  return request('/api/control-policies')
    .catch((error) => withApiFallback(error, () => defaultSensitiveAppliances().map((item) => ({
      serviceLabel: item.serviceLabel,
      automaticResponseMode: item.automaticResponseMode,
      responseDbThreshold: item.responseDbThreshold
    })), 'control policies'));
}

export async function updateControlPolicy(serviceLabel, policy) {
  if (isMockApiEnabled()) {
    return { serviceLabel, ...policy, saved: true };
  }
  return request(`/api/control-policies/${encodeURIComponent(serviceLabel)}`, {
    method: 'PATCH',
    body: policy
  }).catch((error) => withApiFallback(error, () => ({ serviceLabel, ...policy, saved: true }), 'update control policy'));
}
