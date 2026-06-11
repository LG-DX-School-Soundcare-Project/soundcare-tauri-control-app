import mockTelemetry from '../data/mockApplianceModuleTelemetry.json';
import { defaultDeviceAgents } from './fallbacks.js';

// MVP 기준: device_agents 테이블과 Agent 상태 API는 삭제되었다.
// Agent는 dB 측정값만 업로드하므로, 화면의 Agent 상태는 로컬 표시 전용 데이터다.

function normalizeAgent(agent) {
  if (!agent) return null;
  const status = agent.status ?? (agent.online ? 'ONLINE' : 'OFFLINE');
  return {
    ...agent,
    status,
    online: status === 'ONLINE' || agent.online === true,
    localOnly: true
  };
}

export async function getDeviceAgents() {
  const agents = mockTelemetry.deviceAgents ?? defaultDeviceAgents();
  return agents.map(normalizeAgent);
}

export async function getDeviceAgent(agentId) {
  const agents = await getDeviceAgents();
  return agents.find((agent) => agent.agentId === agentId) ?? null;
}
