const deviceTypeText = {
  IOT_HUB_PHONE: 'IoT Hub 스마트폰',
  USER_DEVICE_PHONE: '사용자 스마트폰',
  APPLIANCE_SOUND_MODULE: '가전 소리 모듈',
  APPLIANCE_NOISE_METER: '가전 소음 미터',
  APPLIANCE_PROTOTYPE_CONTROLLER: '가전 모형 컨트롤러',
  ENV_SENSOR: '환경 센서'
};

export function DeviceCard(device) {
  const id = device.id ?? device.deviceId;
  const type = device.type ?? device.deviceType;
  const connected = device.connected ?? device.active ?? false;
  const state = connected ? '연결됨' : '연결 끊김';
  const tone = connected ? 'online' : 'offline';
  return `
    <article class="device-card device-card--${tone}" data-device-id="${id}">
      <div>
        <strong>${device.name}</strong>
        <p>${deviceTypeText[type] ?? type} · ${device.roomName ?? '방 미지정'}</p>
      </div>
      <span>${state}</span>
      <small>마지막 확인: ${device.lastSeenAt ?? '-'}</small>
    </article>
  `;
}
