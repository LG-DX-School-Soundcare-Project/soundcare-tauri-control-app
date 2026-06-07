import mockHomeStatus from '../data/mockHomeStatus.json';
import { request, isMockApiEnabled, buildQuery } from './client.js';
import { defaultHomeStatus, defaultNoiseEvents, defaultRobotAvoidanceEvents, withApiFallback } from './fallbacks.js';

export async function getCurrentHomeStatus() {
  if (isMockApiEnabled()) {
    return mockHomeStatus;
  }
  return request('/api/home/current-status')
    .catch((error) => withApiFallback(error, defaultHomeStatus, 'current home status'));
}

export async function getNoiseEvents(params = {}) {
  if (isMockApiEnabled()) {
    return defaultNoiseEvents();
  }
  return request(`/api/iot/events${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, defaultNoiseEvents, 'noise events'));
}

export async function getRobotAvoidanceEvents(params = {}) {
  if (isMockApiEnabled()) {
    return defaultRobotAvoidanceEvents();
  }
  return request(`/api/robot-avoid-events${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, defaultRobotAvoidanceEvents, 'robot avoidance events'));
}
