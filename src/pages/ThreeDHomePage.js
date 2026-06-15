import { createInteractiveHomeScene } from '../three/interactiveHomeScene.js';
import { householdHeader } from '../components/householdHeader.js';
import { mountLowConfidenceNoticePopup } from './LowConfidenceNoticePopup.js';
import { getDeviceIcon } from '../utils/deviceIcons.js';
import { getCurrentHomeStatus } from '../api/eventApi.js';
import { getApplianceMeasurements } from '../api/applianceMeasurementApi.js';
import { getRuntimeSettings } from '../api/deviceApi.js';
import { startRealtimePoll, isFreshTimestamp } from '../utils/realtimePoll.js';

let sceneController = null;
let lowConfidencePopupCleanup = null;
let realtimeStop = null;
// serviceLabel ↔ userRegisteredDeviceId 매핑(runtime)은 거의 안 바뀌므로 캐시해
// 실시간 폴링마다 다시 요청하지 않는다.
let cachedLabelByDevice = null;

const LOW_CONFIDENCE_POPUP_THRESHOLD = 0.6;

const SERVICE_LABEL_KO = {
  robot_vacuum: '로봇청소기',
  washing_machine: '세탁기',
  dishwasher: '식기세척기',
  refrigerator: '냉장고',
  background: '배경음'
};

const ROOM_LABEL_KO = {
  'Living Room': '거실',
  Bedroom: '침실',
  'Laundry Area': '세탁실',
  Kitchen: '주방',
  Study: '작업실'
};

function roomLabel(room) {
  return ROOM_LABEL_KO[room] ?? room ?? '방 미지정';
}

// serviceLabel/기기명 → 3D GLB 키. 등록된 가전만 3D 홈에 보이게 할 때 사용.
const GLB_KEY_BY_LABEL = {
  robot_vacuum: 'robot',
  washing_machine: 'washer',
  dishwasher: 'dishwasher',
  refrigerator: 'refrigerator'
};

// 계정에 등록된 가전의 GLB 키 목록(3D 홈 표시 대상). 비면 전체 표시로 두지 않고 빈 집.
let activeApplianceKeys = [];
// 가전별 실시간 측정 dB(소리 GLB 크기/표시용). 값 없으면 null → 숨김.
let applianceDbByKey = {};

// 백엔드(DB)에서 채워지는 활성 예측/기기 카드. 하드코딩 더미는 제거되었다.
let activePrediction = { modelLabel: 'background', confidence: 1, thresholdValue: 0.7 };
let applianceCards = [];
let activeDb = 0;
let activeRoom = '방 미지정';

async function loadThreeDHomeData(reuseLabels = false) {
  let home = null;
  try {
    home = await getCurrentHomeStatus();
  } catch (error) {
    console.warn('[SoundCare] 3D 홈 데이터 로드 실패', error);
  }

  activePrediction = {
    modelLabel: home?.currentServiceLabel ?? 'background',
    confidence: Number(home?.confidence ?? 1),
    thresholdValue: 0.7
  };
  // ESP가 비활성(최신 소음/측정값이 오래됨)이면 활성 dB를 --로 표시.
  const activeFresh = isFreshTimestamp(home?.createdAt);
  const activeDbNum = Math.round(Number(home?.decibelMax ?? home?.decibelAvg ?? 0));
  activeDb = activeFresh && Number.isFinite(activeDbNum) ? activeDbNum : '--';
  activeRoom = roomLabel(home?.roomName);

  const devices = home?.registeredDevices ?? [];
  // 실시간 폴링 시에는 캐시된 라벨 매핑을 재사용한다(runtime 재요청 생략).
  let labelByDevice = reuseLabels ? cachedLabelByDevice : null;
  if (!labelByDevice) {
    let runtime = null;
    try {
      runtime = await getRuntimeSettings();
    } catch (error) {
      runtime = null;
    }
    labelByDevice = new Map(
      (runtime?.sensitiveAppliances ?? []).map((s) => [s.userRegisteredDeviceId, s.serviceLabel])
    );
    cachedLabelByDevice = labelByDevice;
  }

  let measurements = [];
  try {
    measurements = (await getApplianceMeasurements({ limit: 100 })) ?? [];
  } catch (error) {
    measurements = [];
  }
  const latestByLabel = new Map();
  for (const m of measurements) {
    const label = m.serviceLabel ?? m.applianceType;
    if (label && !latestByLabel.has(label)) latestByLabel.set(label, m);
  }

  // 등록된 가전의 GLB 키(3D 표시 대상). label(runtime) 우선, 없으면 device.name(serviceLabel).
  activeApplianceKeys = devices
    .map((device) => {
      const id = device.registeredDeviceId ?? device.id;
      const label = labelByDevice.get(id) ?? device.name;
      return GLB_KEY_BY_LABEL[label];
    })
    .filter(Boolean);

  // 소리 GLB(emitter)용 가전별 실시간 dB. 값 없으면(--/stale) null → 숨김.
  applianceDbByKey = {};

  applianceCards = devices.map((device) => {
    const id = device.registeredDeviceId ?? device.id;
    const label = labelByDevice.get(id);
    const measurement = label ? latestByLabel.get(label) : null;
    // 측정값이 오래되면(ESP 비활성) --로 표시.
    const fresh = measurement && isFreshTimestamp(measurement.measuredAt ?? measurement.createdAt);
    const db = fresh
      ? Math.round(Number(measurement.decibelMax ?? measurement.decibelAvg ?? measurement.relativeDb))
      : null;
    const glbKey = GLB_KEY_BY_LABEL[label ?? device.name];
    if (glbKey) applianceDbByKey[glbKey] = db != null && Number.isFinite(db) ? db : null;
    return {
      name: (label && SERVICE_LABEL_KO[label]) || device.name || '기기',
      room: roomLabel(device.roomName),
      decibel: db != null && Number.isFinite(db) ? db : '--',
      deviceId: id
    };
  });
}

function applianceCardsHtml() {
  if (!applianceCards.length) {
    return '<p class="device-list-empty">등록된 기기가 없습니다.</p>';
  }
  return applianceCards
    .map(
      (item) => `
                <a class="appliance-noise-card" href="#/devices/${encodeURIComponent(item.deviceId)}" aria-label="${item.name} 상세 보기">
                  <h2>${item.name}</h2>
                  <p>${item.room}</p>
                  <div class="appliance-noise-card__body">
                    <div class="appliance-picture-slot has-device-icon" aria-label="${item.name} 이미지 자리">${getDeviceIcon(item.name)}</div>
                    <strong data-db-for="${item.deviceId}">${item.decibel} dB</strong>
                  </div>
                </a>
              `
    )
    .join('');
}

// 화면은 즉시 렌더하고(전역 시작 스플래시가 로딩을 담당), 백엔드 데이터는 mount 후
// 비동기로 채운다. 그래서 3D 화면을 열 때 페이지 단위 "Loading" 텍스트가 뜨지 않는다.
export function renderThreeDHomePage() {
  return `
    <section class="page three-view-page" aria-label="3D 홈 보기">
      ${householdHeader({})}
      <p class="three-view-active-pill" data-active-pill><span></span>활성 ${activeDb} dB</p>

      <div class="three-view-content">
        <section class="three-view-stage" aria-label="3D 홈 캔버스">
          <div class="three-view-stage-header">
            <button
              type="button"
              id="sound-viz-toggle"
              class="sound-viz-toggle is-on"
              aria-pressed="true"
              aria-label="소리 시각화 끄기"
            >
              <span class="sound-viz-toggle__dot" aria-hidden="true"></span>
              <span class="sound-viz-toggle__label">소리 시각화 켜짐</span>
            </button>
          </div>
          <p class="three-view-mobile-source" data-source>소음원: ${activeRoom}</p>
          <div id="three-home-container" class="three-view-container" aria-label="인터랙티브 3D 홈"></div>
        </section>

        <aside class="appliance-noise-panel" data-appliance-panel aria-label="기기별 소음 상태">
          ${applianceCardsHtml()}
        </aside>
      </div>
    </section>
  `;
}

// DOM을 최신 데이터로 갱신한다. 실시간 폴링마다 호출되므로 깜빡임을 줄이려
// 카드 구성이 그대로면 dB 숫자만 바꾸고, 기기 구성이 바뀐 경우에만 패널을 재구성한다.
function updateThreeDHomeDom() {
  // 데이터가 늦게 도착했을 때 이미 다른 화면으로 이동했다면 아무것도 하지 않는다.
  if (!document.querySelector('.three-view-page')) return;
  const pill = document.querySelector('[data-active-pill]');
  if (pill) pill.innerHTML = `<span></span>활성 ${activeDb} dB`;
  const source = document.querySelector('[data-source]');
  if (source) source.textContent = `소음원: ${activeRoom}`;

  const panel = document.querySelector('[data-appliance-panel]');
  if (!panel) return;
  const canUpdateInPlace =
    applianceCards.length > 0 &&
    applianceCards.every((item) => panel.querySelector(`[data-db-for="${item.deviceId}"]`));
  if (canUpdateInPlace) {
    for (const item of applianceCards) {
      const el = panel.querySelector(`[data-db-for="${item.deviceId}"]`);
      if (el) el.textContent = `${item.decibel} dB`;
    }
  } else {
    panel.innerHTML = applianceCardsHtml();
  }
}

function maybeShowLowConfidencePopup() {
  if (activePrediction.confidence < LOW_CONFIDENCE_POPUP_THRESHOLD) {
    const popupController = mountLowConfidenceNoticePopup();
    lowConfidencePopupCleanup = popupController.cleanup;
    popupController.openPopup(activePrediction);
  }
}

export function mountThreeDHomePage() {
  cleanupThreeDHomePage();

  const container = document.querySelector('#three-home-container');
  if (container) {
    sceneController = createInteractiveHomeScene(container);
  }

  // 백엔드 데이터는 씬을 띄운 뒤 비동기로 불러와 DOM을 갱신한다.
  loadThreeDHomeData()
    .then(() => {
      updateThreeDHomeDom();
      // 등록된 가전만 3D 홈에 노출한다.
      sceneController?.setActiveAppliances?.(activeApplianceKeys);
      // 소리 GLB를 실시간 측정 dB에 맞춰 키우고(없으면 숨김).
      sceneController?.setApplianceDecibels?.(applianceDbByKey);
      maybeShowLowConfidencePopup();
      // 이후 ESP→Agent가 올리는 최신 dB를 주기적으로 폴링해 실시간 갱신한다.
      realtimeStop = startRealtimePoll(async () => {
        await loadThreeDHomeData(true);
        updateThreeDHomeDom();
        sceneController?.setApplianceDecibels?.(applianceDbByKey);
      });
    })
    .catch((error) => console.warn('[SoundCare] 3D 홈 데이터 갱신 실패', error));

  const vizToggle = document.querySelector('#sound-viz-toggle');
  if (vizToggle) {
    let soundVizOn = true;
    vizToggle.addEventListener('click', () => {
      soundVizOn = !soundVizOn;
      sceneController?.setSoundVisualization?.(soundVizOn);
      vizToggle.classList.toggle('is-on', soundVizOn);
      vizToggle.setAttribute('aria-pressed', soundVizOn ? 'true' : 'false');
      vizToggle.setAttribute('aria-label', soundVizOn ? '소리 시각화 끄기' : '소리 시각화 켜기');
      vizToggle.querySelector('.sound-viz-toggle__label').textContent = soundVizOn
        ? '소리 시각화 켜짐'
        : '소리 시각화 꺼짐';
    });
  }
}

export function cleanupThreeDHomePage() {
  realtimeStop?.();
  realtimeStop = null;
  lowConfidencePopupCleanup?.();
  lowConfidencePopupCleanup = null;
  sceneController?.dispose?.();
  sceneController = null;
}
