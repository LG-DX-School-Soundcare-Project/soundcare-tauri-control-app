import mockHomeStatus from '../data/mockHomeStatus.json';
import mockTelemetry from '../data/mockApplianceModuleTelemetry.json';
import { DEV_AUTH_PROFILE, isApiFallbackEnabled } from './client.js';

export const DEMO_AUTH_TOKEN = 'dev-placeholder-jwt-token';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function cloneDefault(value) {
  return clone(value);
}

export function withApiFallback(error, fallbackFactory, label = 'SoundCare API') {
  if (!isApiFallbackEnabled()) {
    throw error;
  }
  if (error) {
    console.warn(`[SoundCare] ${label} failed. Using local default values.`, error);
  }
  return typeof fallbackFactory === 'function' ? fallbackFactory() : clone(fallbackFactory);
}

export function defaultAuthUser(profile = DEV_AUTH_PROFILE) {
  return {
    id: 'user-demo-001',
    email: profile.email,
    nickname: profile.nickname ?? profile.displayName,
    aiRoutineConsent: true,
    aiDataUseConsent: true
  };
}

export function defaultHomeStatus() {
  return clone(mockHomeStatus);
}

export function defaultDevices() {
  return clone(mockHomeStatus.devices);
}

export function defaultSensitiveAppliances() {
  return clone(mockHomeStatus.sensitiveAppliances);
}

export function defaultNotifications() {
  return clone(mockHomeStatus.notifications);
}

export function defaultRoutineRecommendations() {
  return clone(mockHomeStatus.routineRecommendations);
}

export function defaultBasicReport() {
  return clone(mockHomeStatus.basicReport);
}

export function defaultNoiseEvents() {
  return [
    {
      id: 'event-001',
      roomName: mockHomeStatus.roomName,
      serviceLabel: mockHomeStatus.currentServiceLabel,
      decibelMax: mockHomeStatus.decibelMax,
      confidence: mockHomeStatus.confidence,
      createdAt: mockHomeStatus.createdAt
    }
  ];
}

export function defaultRobotAvoidanceEvents() {
  return [clone(mockHomeStatus.robotAvoidanceEvent)];
}

export function defaultDeviceAgents() {
  return clone(mockTelemetry.deviceAgents);
}

export function defaultLatestTelemetry() {
  return clone(mockTelemetry.latestTelemetry);
}
