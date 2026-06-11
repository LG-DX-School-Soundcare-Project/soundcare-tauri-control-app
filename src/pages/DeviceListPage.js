import { escapeHtml } from '../utils/html.js';
import {
  getDeviceFailurePayload,
  isDeviceConnectionFailed,
  mountDeviceConnectionFailurePopup
} from './DeviceConnectionFailurePopup.js';

const deviceRows = [
  { id: 'washer-main', deviceName: '세탁기', room: 'Laundry Area', decibel: 71, time: '12:30' },
  { id: 'robot-living', deviceName: '로봇청소기', room: 'Living Room', decibel: 71, time: '12:30' },
  { id: 'washer-laundry-2', deviceName: '냉장고', room: 'Laundry Area', decibel: '--', time: '11:30' },
  { id: 'washer-laundry-3', deviceName: '에어컨', room: 'Laundry Area', decibel: 71, time: '12:30' },
  { id: 'robot-kitchen-2', deviceName: '식기세척기', room: 'Kitchen', decibel: 64, time: '12:10' },
  { id: 'hub-study-1', deviceName: 'LG 허브', room: 'Study', decibel: 19, time: '11:52' }
];

function deviceCard(device) {
  const failed = isDeviceConnectionFailed(device);
  return `
    <a class="device-list-card ${failed ? 'device-list-card--failed' : ''}" href="#/devices/${encodeURIComponent(device.id)}" aria-label="${escapeHtml(device.deviceName)} (${escapeHtml(device.room)}) device detail" ${failed ? `data-device-failure="${escapeHtml(device.id)}"` : ''}>
      <div class="device-list-picture" aria-hidden="true"></div>
      <div class="device-list-meta">
        <p>${escapeHtml(device.deviceName)}</p>
        <p>${escapeHtml(device.decibel)} dB</p>
        <p>${escapeHtml(device.time)}</p>
      </div>
      <span class="device-refresh-icon" aria-hidden="true">&#8635;</span>
    </a>
  `;
}

export async function renderDeviceListPage() {
  const failedCount = deviceRows.filter(isDeviceConnectionFailed).length;
  const onlineCount = deviceRows.length - failedCount;
  const attentionCopy =
    failedCount === 1 ? '1 device needs attention.' : `${failedCount} devices need attention.`;

  return `
    <section class="page device-list-page" aria-label="Device list screen">
      <header class="device-list-header">
        <div class="device-list-heading">
          <h1>Devices</h1>
          <p>${deviceRows.length} devices - ${onlineCount} online - ${failedCount} unstable</p>
        </div>
        <button class="device-add-button" type="button">Add</button>
      </header>

      <section class="device-filter-bar" aria-label="Device filters">
        <button type="button">All rooms</button>
        <button type="button">All status</button>
        <label>
          <span class="hidden">Search devices</span>
          <input type="search" placeholder="Search devices" />
        </label>
      </section>

      <section class="device-warning-banner" aria-label="Device connection warning">
        <span class="device-warning-dot" aria-hidden="true"></span>
        <p>${attentionCopy}</p>
        <button type="button">Review</button>
      </section>

      <section class="device-list-grid" aria-label="Registered devices">
        ${deviceRows.map(deviceCard).join('')}
      </section>
    </section>
  `;
}

let popupCleanup = null;

export function mountDeviceListPage({ navigate } = {}) {
  cleanupDeviceListPage();
  const failedDevices = deviceRows.filter(isDeviceConnectionFailed).map(getDeviceFailurePayload);
  const popupController = mountDeviceConnectionFailurePopup({ navigate });
  popupCleanup = popupController.cleanup;
  const failedDeviceMap = new Map(failedDevices.map((device) => [device.id, device]));

  document.querySelector('.device-warning-banner button')?.addEventListener('click', () => {
    if (failedDevices[0]) popupController.openPopup(failedDevices[0]);
  });

  document.querySelectorAll('[data-device-failure]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const failedDevice = failedDeviceMap.get(link.dataset.deviceFailure);
      if (failedDevice) popupController.openPopup(failedDevice);
    });
  });

  if (failedDevices[0]) {
    popupController.openPopup(failedDevices[0]);
  }
}

export function cleanupDeviceListPage() {
  popupCleanup?.();
  popupCleanup = null;
}
