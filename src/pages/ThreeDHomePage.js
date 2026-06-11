import { createInteractiveHomeScene } from '../three/interactiveHomeScene.js';
import { mountLowConfidenceNoticePopup } from './LowConfidenceNoticePopup.js';

let sceneController = null;
let lowConfidencePopupCleanup = null;

const LOW_CONFIDENCE_POPUP_THRESHOLD = 0.6;
const activePrediction = {
  modelLabel: 'vacuum_cleaner',
  confidence: 0.42,
  thresholdValue: 0.7
};

const applianceCards = [
  { name: 'Robot vacuum', room: 'Kitchen', decibel: 50 },
  { name: 'Washing Machine', room: 'Laundry room', decibel: 73 },
  { name: 'Refrigerator', room: 'Kitchen', decibel: 42 },
  { name: 'AI home hub', room: 'Living room', decibel: 7 },
  { name: 'Robot vacuum 2', room: 'Living room', decibel: 38 },
  { name: 'Washing Machine 2', room: 'Laundry room', decibel: 68 }
];

export async function renderThreeDHomePage() {
  return `
    <section class="page three-view-page" aria-label="3D home view">
      <header class="dashboard-household-header three-view-household-header">
        <h1 class="dashboard-desktop-title">조호성 님의 Home</h1>
        <div class="dashboard-mobile-title"></div>
        <p class="dashboard-mobile-sync">Active · 42 dB</p>
      </header>
      <p class="three-view-active-pill"><span></span>Active 42 dB</p>

      <div class="three-view-content">
        <section class="three-view-stage" aria-label="3D home canvas">
          <h2>
            <span class="three-title-desktop">Home view</span>
            <span class="three-title-mobile">Room map</span>
          </h2>
          <p class="three-view-mobile-source">Noise source: Laundry Area</p>
          <div id="three-home-container" class="three-view-container" aria-label="Interactive 3D home"></div>
        </section>

        <aside class="appliance-noise-panel" aria-label="Appliance noise status">
          ${applianceCards
            .map(
              (item) => `
                <section class="appliance-noise-card">
                  <h2>${item.name}</h2>
                  <p>${item.room}</p>
                  <div class="appliance-noise-card__body">
                    <div class="appliance-picture-slot" aria-label="${item.name} picture placeholder"></div>
                    <strong>${item.decibel} dB</strong>
                  </div>
                </section>
              `
            )
            .join('')}
        </aside>
      </div>
    </section>
  `;
}

export function mountThreeDHomePage() {
  cleanupThreeDHomePage();

  if (activePrediction.confidence < LOW_CONFIDENCE_POPUP_THRESHOLD) {
    const popupController = mountLowConfidenceNoticePopup();
    lowConfidencePopupCleanup = popupController.cleanup;
    popupController.openPopup(activePrediction);
  }

  const container = document.querySelector('#three-home-container');
  if (!container) return;

  sceneController = createInteractiveHomeScene(container);
}

export function cleanupThreeDHomePage() {
  lowConfidencePopupCleanup?.();
  lowConfidencePopupCleanup = null;
  sceneController?.dispose?.();
  sceneController = null;
}
