// 시연(데모) 모드 전용 하드코딩 데이터.
// 화면들이 실제로 읽는 필드 형태(registeredDevices, sensorUpdatedAt, 신선한 측정 타임스탬프 등)에
// 정확히 맞춰, 백엔드 없이도 모든 기능이 "살아있는" 것처럼 보이게 한다.
import mockHomeStatus from '../data/mockHomeStatus.json';

// 데모에 등장하는 가전(소음 발생) + 허브. 3D 홈은 name(serviceLabel)으로 GLB를 매핑한다.
const DEMO_APPLIANCES = [
  { id: 'rdev-robot', label: 'robot_vacuum', ko: '로봇청소기', room: '거실', db: 64, playing: true },
  { id: 'rdev-washer', label: 'washing_machine', ko: '세탁기', room: '세탁실', db: 58, playing: true },
  { id: 'rdev-dish', label: 'dishwasher', ko: '식기세척기', room: '주방', db: 52, playing: true },
  { id: 'rdev-fridge', label: 'refrigerator', ko: '냉장고', room: '주방', db: 47, playing: true }
];

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// 기기 목록 / 3D 홈이 사용하는 registeredDevices.
export function demoRegisteredDevices() {
  const devices = DEMO_APPLIANCES.map((a) => ({
    registeredDeviceId: a.id,
    id: a.id,
    name: a.label, // 3D GLB_KEY_BY_LABEL는 name으로 매핑하므로 serviceLabel을 넣는다.
    serviceLabel: a.label,
    roomName: a.room,
    deviceType: 'appliance',
    connected: true,
    lastSeenAt: nowIso()
  }));
  devices.push({
    registeredDeviceId: 'rdev-hub',
    id: 'rdev-hub',
    name: 'LG AI 허브',
    roomName: '거실',
    deviceType: 'hub',
    connected: true,
    lastSeenAt: nowIso()
  });
  return devices;
}

// 홈 대시보드/3D 홈용 현재 상태. mock JSON을 신선한 타임스탬프 + registeredDevices로 보강한다.
export function demoHomeStatus() {
  const base = clone(mockHomeStatus);
  const now = nowIso();
  return {
    ...base,
    createdAt: now,
    sensorUpdatedAt: now,
    lastSyncedAt: now,
    currentNoiseState: 'RECENT_NOISE_EVENT',
    registeredDevices: demoRegisteredDevices()
  };
}

// 기기 id ↔ serviceLabel 매핑(런타임 설정). 기기 카드가 한글 이름/측정값을 붙일 때 사용.
export function demoRuntimeSettings(deviceId) {
  return {
    deviceId,
    settingsVersion: 'demo-settings-v1',
    sensitiveAppliances: DEMO_APPLIANCES.map((a) => ({
      userRegisteredDeviceId: a.id,
      serviceLabel: a.label,
      displayName: a.ko,
      enabled: true
    }))
  };
}

// 가전별 최신 측정값(전부 "방금" 측정한 것처럼 신선하게).
export function demoMeasurements(params = {}) {
  const now = nowIso();
  let rows = DEMO_APPLIANCES.filter((a) => a.playing).map((a) => ({
    serviceLabel: a.label,
    applianceType: a.label,
    decibelAvg: a.db,
    decibelMax: a.db + 5,
    relativeDb: a.db,
    measuredAt: now,
    createdAt: now,
    receivedAt: now,
    uploadedAt: now,
    playbackState: 'PLAYING'
  }));
  if (params.serviceLabel) {
    rows = rows.filter((r) => r.serviceLabel === params.serviceLabel);
  }
  return rows;
}

export function demoLatestMeasurement(params = {}) {
  return demoMeasurements(params)[0] ?? null;
}
