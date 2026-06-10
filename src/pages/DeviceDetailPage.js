import { createDeviceDetailModelScene } from '../three/deviceDetailModelScene.js';
import { escapeHtml } from '../utils/html.js';

let modelSceneController = null;

const deviceDetails = {
  'robot-living': {
    title: 'Robot Vacuum',
    modelType: 'robot',
    modelLabel: 'vacuum_cleaner',
    serviceLabel: 'robot_vacuum'
  },
  refrigerator: {
    title: 'Refrigerator',
    modelType: 'refrigerator',
    modelLabel: 'refrigerator',
    serviceLabel: 'refrigerator'
  }
};

function getDetailConfig(deviceId) {
  if (deviceId?.includes('robot')) return deviceDetails['robot-living'];
  if (deviceId?.includes('fridge') || deviceId?.includes('refrigerator')) return deviceDetails.refrigerator;
  return {
    title: 'Washing Machine',
    modelType: 'washer',
    modelLabel: 'vacuum_cleaner',
    serviceLabel: 'robot_vacuum'
  };
}

export async function renderDeviceDetailPage({ params }) {
  const deviceId = decodeURIComponent(params.deviceId ?? '');
  const detail = getDetailConfig(deviceId);

  return `
    <section class="page device-detail-page" aria-label="Device detail screen">
      <header class="device-detail-topbar">
        <div class="device-detail-title-group">
          <a class="device-detail-back" href="#/devices" aria-label="Back to devices">&larr;</a>
          <p>Devices &gt; ${escapeHtml(detail.title)}</p>
          <h1>${escapeHtml(detail.title)}</h1>
        </div>
        <button class="related-events-button" type="button">Events</button>
      </header>

      <div class="device-detail-layout">
        <section class="device-detail-card device-detail-model-card">
          <h2>Device</h2>
          <div
            id="device-detail-model-viewer"
            class="device-detail-model-viewer"
            data-model-type="${escapeHtml(detail.modelType)}"
            aria-label="${escapeHtml(detail.title)} 3D model"
          ></div>
        </section>

        <section class="device-detail-card device-measurement-card">
          <h2>Live reading</h2>
          <div class="measurement-summary">
            <div>
              <p>Noise</p>
              <strong>62 dB</strong>
              <span>Real-time detection</span>
            </div>
            <dl>
              <div><dt>Model</dt><dd>${escapeHtml(detail.modelLabel)}</dd></div>
              <div><dt>Service</dt><dd>${escapeHtml(detail.serviceLabel)}</dd></div>
              <div><dt>Confidence</dt><dd>0.86</dd></div>
            </dl>
          </div>

          <ul class="measurement-event-list" aria-label="Recent measurement events">
            <li><span></span><p>12:30 event 238 - 62 dB</p></li>
            <li><span></span><p>12:18 vacuum_cleaner</p></li>
            <li><span></span><p>12:05 positive reaction</p></li>
            <li><span></span><p>11:42 upload complete</p></li>
          </ul>
        </section>

        <section class="device-detail-card device-recommendation-card">
          <h2>Recommendation</h2>
          <p>After 22:00, lower speaker volume and delay cleaning when vacuum noise repeats.</p>
          <button type="button">Use rule</button>
        </section>
      </div>
    </section>
  `;
}

export function mountDeviceDetailPage() {
  const viewer = document.querySelector('#device-detail-model-viewer');
  if (!viewer) return;

  cleanupDeviceDetailPage();
  modelSceneController = createDeviceDetailModelScene(viewer, {
    modelType: viewer.dataset.modelType || 'washer'
  });
}

export function cleanupDeviceDetailPage() {
  modelSceneController?.dispose?.();
  modelSceneController = null;
}
