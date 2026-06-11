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
  return request(`/api/events/noise${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, defaultNoiseEvents, 'noise events'));
}

// MVP 기준: robot_avoid_events 테이블/API는 삭제되었다.
// 로봇 회피는 프론트엔드 GLB 경로 시뮬레이션으로만 처리하므로 로컬 데이터만 반환한다.
export async function getRobotAvoidanceEvents() {
  return defaultRobotAvoidanceEvents();
}
