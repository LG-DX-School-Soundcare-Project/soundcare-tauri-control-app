import mockTelemetry from '../data/mockApplianceModuleTelemetry.json';
import { request, isMockApiEnabled, buildQuery } from './client.js';
import { defaultLatestTelemetry, withApiFallback } from './fallbacks.js';

// Appliance Controller Agent PC가 ESP32-S3에서 받은 INMP441 상대 dB 측정값과
// 재생 상태를 Spring Boot에 업로드한다. Tauri/Web은 그 최신값을 조회한다.

const STALE_THRESHOLD_MS = 10000;

function normalizeMeasurement(measurement) {
  if (!measurement) return null;
  const metadata = measurement.metadata ?? {};
  return {
    ...measurement,
    moduleId: measurement.moduleId ?? measurement.sourceModuleId,
    applianceType: measurement.applianceType ?? measurement.serviceLabel,
    relativeDb: measurement.relativeDb ?? measurement.relativeNoiseLevel,
    receivedAt: measurement.receivedAt ?? measurement.createdAt,
    uploadedAt: measurement.uploadedAt ?? measurement.createdAt,
    playbackState: measurement.playbackState ?? metadata.playbackState,
    sampleName: measurement.sampleName ?? metadata.sampleName,
    volumePercent: measurement.volumePercent ?? metadata.volumePercent,
    rms: measurement.rms ?? metadata.rms,
    measuredBy: measurement.measuredBy ?? metadata.measuredBy,
    moduleTimestampMs: measurement.moduleTimestampMs ?? metadata.moduleTimestampMs
  };
}

function matchesMeasurementFilters(measurement, params = {}) {
  if (!measurement) return false;
  if (params.serviceLabel && measurement.serviceLabel !== params.serviceLabel && measurement.applianceType !== params.serviceLabel) {
    return false;
  }
  if (params.sourceModuleId && measurement.moduleId !== params.sourceModuleId && measurement.sourceModuleId !== params.sourceModuleId) {
    return false;
  }
  if (params.agentId && measurement.agentId !== params.agentId) {
    return false;
  }
  return true;
}

export async function getLatestApplianceMeasurement(params = {}) {
  if (isMockApiEnabled()) {
    const latest = mockTelemetry.latestTelemetry;
    if (!matchesMeasurementFilters(latest, params)) {
      return null;
    }
    return normalizeMeasurement(latest);
  }
  const latest = await request(`/api/events/appliance-measurements/latest${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, () => {
      const fallback = defaultLatestTelemetry();
      return matchesMeasurementFilters(fallback, params) ? fallback : null;
    }, 'latest appliance measurement'));
  return normalizeMeasurement(latest);
}

export async function getApplianceMeasurements(params = {}) {
  if (isMockApiEnabled()) {
    const latest = mockTelemetry.latestTelemetry;
    return matchesMeasurementFilters(latest, params) ? [normalizeMeasurement(latest)] : [];
  }
  const measurements = await request(`/api/events/appliance-measurements${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, () => {
      const fallback = defaultLatestTelemetry();
      return matchesMeasurementFilters(fallback, params) ? [fallback] : [];
    }, 'appliance measurements'));
  return (measurements ?? []).map(normalizeMeasurement);
}

/**
 * 텔레메트리가 stale 한지 판단한다. receivedAt/uploadedAt 기준으로
 * 기준 시간(기본 10초)을 넘으면 stale 로 본다.
 */
export function isTelemetryStale(telemetry, { now = Date.now(), thresholdMs = STALE_THRESHOLD_MS } = {}) {
  if (!telemetry) return true;
  const reference = telemetry.receivedAt ?? telemetry.uploadedAt;
  if (!reference) return true;
  const referenceMs = new Date(reference).getTime();
  if (Number.isNaN(referenceMs)) return true;
  return now - referenceMs > thresholdMs;
}
