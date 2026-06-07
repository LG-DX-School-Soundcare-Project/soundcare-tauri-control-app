import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentHomeStatus } from '../src/api/eventApi.js';
import { isTelemetryStale } from '../src/api/applianceMeasurementApi.js';
import { computeNoiseWaveIntensity } from '../src/three/noiseEffect.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dashboard API fallback defaults', () => {
  it('returns hardcoded home status when the API is unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

    const status = await getCurrentHomeStatus();

    expect(status.homeId).toBe('home-demo-001');
    expect(status.currentServiceLabel).toBe('robot_vacuum');
  });
});

describe('3D telemetry display helpers', () => {
  const now = new Date('2026-06-03T12:15:30+09:00').getTime();

  it('flags telemetry as stale when older than threshold', () => {
    const telemetry = { receivedAt: '2026-06-03T12:15:00+09:00' };
    expect(isTelemetryStale(telemetry, { now })).toBe(true);
  });

  it('treats fresh telemetry as not stale', () => {
    const telemetry = { receivedAt: '2026-06-03T12:15:29+09:00' };
    expect(isTelemetryStale(telemetry, { now })).toBe(false);
  });

  it('maps higher dB to higher visual wave intensity', () => {
    const quiet = computeNoiseWaveIntensity(45);
    const loud = computeNoiseWaveIntensity(70);
    expect(loud).toBeGreaterThan(quiet);
  });
});
