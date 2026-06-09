import { escapeHtml } from '../utils/html.js';

function getFailureReason(device) {
  if (device?.decibel === '--') {
    return 'No response after dB scan timeout.';
  }
  return 'Device connection status could not be confirmed.';
}

function getAffectedDeviceName(device) {
  return `${device.id} / ${device.room}`;
}

export function renderDeviceConnectionFailurePopup() {
  return `
    <div id="device-connection-failure-popup" class="device-failure-backdrop hidden" aria-hidden="true">
      <section class="device-failure-modal" role="dialog" aria-modal="true" aria-labelledby="device-failure-title">
        <h2 id="device-failure-title">Connection failed</h2>
        <p class="device-failure-subtitle">Hardware or sensor is not reachable</p>

        <div class="device-failure-card">
          <strong>Affected device name</strong>
          <p id="device-failure-name">-</p>
        </div>

        <div class="device-failure-card device-failure-card--danger">
          <strong>Failure reason message</strong>
          <p id="device-failure-reason">-</p>
        </div>

        <div class="device-failure-card">
          <strong>Suggested recovery checklist</strong>
          <ul class="device-failure-list">
            <li>Power on device</li>
            <li>Check app permissions</li>
            <li>Move closer and retry</li>
          </ul>
        </div>

        <button type="button" id="device-failure-retry" class="device-failure-primary">Retry</button>

        <div class="device-failure-actions">
          <button type="button" id="device-failure-settings" class="device-failure-secondary">Open settings</button>
          <button type="button" id="device-failure-cancel" class="device-failure-secondary">Cancel</button>
        </div>
      </section>
    </div>
  `;
}

export function mountDeviceConnectionFailurePopup({ navigate } = {}) {
  let root = document.querySelector('#device-connection-failure-popup-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'device-connection-failure-popup-root';
    document.body.appendChild(root);
  }

  root.innerHTML = renderDeviceConnectionFailurePopup();

  const popup = root.querySelector('#device-connection-failure-popup');
  const name = root.querySelector('#device-failure-name');
  const reason = root.querySelector('#device-failure-reason');
  const retryButton = root.querySelector('#device-failure-retry');
  const settingsButton = root.querySelector('#device-failure-settings');
  const cancelButton = root.querySelector('#device-failure-cancel');

  const closePopup = () => {
    popup?.classList.add('hidden');
    popup?.setAttribute('aria-hidden', 'true');
    if (retryButton) retryButton.disabled = false;
    if (retryButton) retryButton.textContent = 'Retry';
  };

  const openPopup = (device) => {
    if (name) name.textContent = getAffectedDeviceName(device);
    if (reason) reason.textContent = getFailureReason(device);
    popup?.classList.remove('hidden');
    popup?.setAttribute('aria-hidden', 'false');
  };

  popup?.addEventListener('click', (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });

  cancelButton?.addEventListener('click', closePopup);

  settingsButton?.addEventListener('click', () => {
    closePopup();
    navigate?.('#/settings');
  });

  retryButton?.addEventListener('click', async () => {
    retryButton.disabled = true;
    retryButton.textContent = 'Retrying...';
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    retryButton.disabled = false;
    retryButton.textContent = 'Retry';
  });

  const cleanup = () => {
    root?.remove();
  };

  return { openPopup, closePopup, cleanup };
}

export function isDeviceConnectionFailed(device) {
  return device?.decibel === '--';
}

export function getDeviceFailurePayload(device) {
  return {
    ...device,
    failureReason: getFailureReason(device),
    affectedName: getAffectedDeviceName(device)
  };
}
