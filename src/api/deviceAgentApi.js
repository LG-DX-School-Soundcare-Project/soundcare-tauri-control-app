import mockTelemetry from '../data/mockApplianceModuleTelemetry.json';
import { request, isMockApiEnabled, buildQuery } from './client.js';
import { defaultDeviceAgents, withApiFallback } from './fallbacks.js';

// Appliance Controller Agent PC 상태를 조회한다. Agent는 ESP32-S3와 USB Serial로
// 통신하는 주체이며, Tauri/Web은 Agent 상태만 표시한다.

function normalizeAgent(agent) {
  if (!agent) return null;
  const status = agent.status ?? (agent.online ? 'ONLINE' : 'OFFLINE');
  return {
    ...agent,
    status,
    online: status === 'ONLINE' || agent.online === true
  };
}

export async function getDeviceAgents(params = {}) {
  if (isMockApiEnabled()) {
    return mockTelemetry.deviceAgents.map(normalizeAgent);
  }
  const agents = await request(`/api/device-agents${buildQuery(params)}`)
    .catch((error) => withApiFallback(error, defaultDeviceAgents, 'device agents'));
  return (agents ?? []).map(normalizeAgent);
}

export async function getDeviceAgent(agentId) {
  if (isMockApiEnabled()) {
    return normalizeAgent(mockTelemetry.deviceAgents.find((agent) => agent.agentId === agentId) ?? null);
  }
  const agent = await request(`/api/device-agents/${encodeURIComponent(agentId)}`)
    .catch((error) => withApiFallback(error, () => (
      defaultDeviceAgents().find((item) => item.agentId === agentId) ?? null
    ), 'device agent detail'));
  return normalizeAgent(agent);
}
