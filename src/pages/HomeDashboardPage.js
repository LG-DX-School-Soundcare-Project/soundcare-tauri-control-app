import { getCurrentHomeStatus } from '../api/eventApi.js';
import { mountServerConnectionFailurePopup } from './ServerConnectionFailurePopup.js';
import { createDashboardHomeScene } from '../three/dashboardHomeScene.js';
import { householdHeader } from '../components/householdHeader.js';
import { escapeHtml } from '../utils/html.js';
import { startRealtimePoll, isFreshTimestamp } from '../utils/realtimePoll.js';
import { createReactionSnapshot } from '../api/reactions.js';
import { getRecentNotifications } from '../api/notificationApi.js';
import { getSensitiveAppliances } from '../api/settingsApi.js';

let dashboardSceneController = null;
let dashboardSceneMediaCleanup = null;
let serverFailurePopupCleanup = null;
let realtimeStop = null;
// 라이브 알림 토스트 상태. 마운트 시점에 이미 존재하던 알림은 baseline 으로 묶어
// 다시 띄우지 않고, 이후 새로 들어온 가전 소음 알림만 토스트로 노출한다.
let seenNotificationIds = null;
let notificationToastTimer = null;

// serviceLabel/기기명 → 3D GLB 키. 등록된 가전만 3D 홈에 노출한다.
const GLB_KEY_BY_LABEL = {
  robot_vacuum: 'robot',
  washing_machine: 'washer',
  dishwasher: 'dishwasher',
  refrigerator: 'refrigerator'
};
let activeApplianceKeys = [];
// 트리거(가전 소음 알림) 발동 시 소음 상태를 "위험"으로 표시할 기한(ms). 새 알림이 들어올
// 때마다 연장되고, 소음이 멈춰 새 알림이 끊기면 만료되어 다시 "안정"으로 돌아간다.
let dangerUntil = 0;
let dangerSub = '소음 트리거가 발동했습니다';
let lastStatus = null;
const DANGER_HOLD_MS = 30000;

function isDangerActive() {
  return Date.now() < dangerUntil;
}

const SERVICE_LABEL_KO = {
  robot_vacuum: '로봇청소기',
  washing_machine: '세탁기',
  dishwasher: '식기세척기',
  refrigerator: '냉장고',
  background: '배경음'
};

// currentNoiseState(백엔드) → 화면 표기. 알 수 없으면 '--'.
const NOISE_STATE_KO = {
  QUIET: { title: '안정', sub: '중요 이벤트 없음' },
  STABLE: { title: '안정', sub: '중요 이벤트 없음' },
  RECENT_NOISE_EVENT: { title: '최근 소음', sub: '최근 소음 이벤트 감지' },
  ONGOING_NOISE_EVENT: { title: '주의', sub: '소음 진행 중' }
};

// 숫자 지표: API 값이 없으면 하드코딩 대신 '--'.
function formatMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : '--';
}

function getSyncTime(status) {
  const source = status.lastSyncedAt ?? status.lastSyncAt ?? status.createdAt;
  if (!source) return '--:--';

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return '--:--';

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// 알림 DTO 필드명 호환(notificationId/notificationType = 백엔드, id/type = mock/fallback).
function notificationId(n) {
  return n?.notificationId ?? n?.id ?? null;
}
function notificationType(n) {
  return n?.notificationType ?? n?.type ?? '';
}
// 가전 소음 임계값 초과(로봇청소기/세탁기 등) 위주로 토스트를 띄운다.
function isAlertNotification(n) {
  return notificationType(n) === 'APPLIANCE_NOISE_ALERT' || n?.severity === 'WARNING';
}

// 마운트 시점에 이미 있던 알림을 baseline 으로 기록(과거 알림 토스트 방지).
async function primeNotificationBaseline() {
  const list = await getRecentNotifications(10).catch(() => []);
  seenNotificationIds = new Set((list ?? []).map(notificationId).filter(Boolean));
}

// 폴링마다 새 알림을 확인하고, 가전 소음 알림이면 토스트로 노출한다.
async function pollNotifications() {
  if (seenNotificationIds == null) return; // baseline 준비 전
  const list = await getRecentNotifications(10).catch(() => null);
  if (!Array.isArray(list)) return;
  const fresh = list.filter((n) => notificationId(n) && !seenNotificationIds.has(notificationId(n)));
  fresh.forEach((n) => seenNotificationIds.add(notificationId(n)));
  const alert = fresh.find(isAlertNotification);
  if (alert) {
    showNotificationToast(alert);
    // 트리거 발동 → 소음 상태를 "위험"으로 전환하고 기한을 연장한다.
    dangerUntil = Date.now() + DANGER_HOLD_MS;
    dangerSub = alert.message || alert.title || '소음 트리거가 발동했습니다';
    updateDashboardDom(lastStatus ?? {});
  }
}

function showNotificationToast(notification) {
  if (typeof document === 'undefined') return;
  document.querySelector('.dashboard-alert-toast')?.remove();
  if (notificationToastTimer) {
    window.clearTimeout(notificationToastTimer);
    notificationToastTimer = null;
  }
  const toast = document.createElement('button');
  toast.type = 'button';
  toast.className = 'dashboard-alert-toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="dashboard-alert-toast__badge" aria-hidden="true">소음 알림</span>
    <strong>${escapeHtml(notification.title ?? '가전 소음 임계값 초과')}</strong>
    <p>${escapeHtml(notification.message ?? '')}</p>
  `;
  toast.addEventListener('click', () => {
    toast.remove();
    window.location.hash = '#/notifications';
  });
  document.body.appendChild(toast);
  // 강제 reflow 후 표시 클래스로 슬라이드 인.
  window.requestAnimationFrame(() => toast.classList.add('is-visible'));
  notificationToastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 320);
    notificationToastTimer = null;
  }, 8000);
}

// home-status에서 화면에 쓰는 파생 값들을 한 곳에서 계산한다(렌더/실시간 갱신 공용).
function deriveDashboard(status) {
  const roomClimate = status.roomClimate ?? {};
  const dbValue = Number(status.decibelMax ?? status.decibelAvg);
  // ESP가 비활성(최신 소음/측정값이 오래됨)이면 감지/소음 값을 --로.
  const noiseFresh = isFreshTimestamp(status.createdAt);
  // 온습도는 Flutter 허브 USB 센서가 올린 값. 최근(60초 내) 업로드가 없으면 미연결로 보고 --.
  const SENSOR_FRESH_MS = 60000;
  const sensorFresh = isFreshTimestamp(status.sensorUpdatedAt, SENSOR_FRESH_MS);
  return {
    temperature: sensorFresh
      ? formatMetric(status.temperature ?? status.dashboardTemperature ?? roomClimate.temperature)
      : '--',
    humidity: sensorFresh
      ? formatMetric(status.humidity ?? status.dashboardHumidity ?? roomClimate.humidity)
      : '--',
    syncTime: getSyncTime(status),
    soundSource: noiseFresh ? (SERVICE_LABEL_KO[status.currentServiceLabel] ?? '--') : '--',
    relativeDb: noiseFresh ? formatMetric(status.decibelMax ?? status.decibelAvg) : '--',
    // 트리거 발동 기한 내면 무조건 "위험"으로 덮어쓴다(가전 소음 알림 = 트리거 발동).
    noiseState: isDangerActive()
      ? { title: '위험', sub: dangerSub }
      : (noiseFresh
          ? (NOISE_STATE_KO[status.currentNoiseState] ?? { title: '--', sub: '상태 정보 없음' })
          : { title: '안정', sub: '최근 소음 없음' }),
    noiseProgress: isDangerActive()
      ? 100
      : (noiseFresh && Number.isFinite(dbValue) ? Math.max(0, Math.min(100, Math.round(dbValue))) : 0)
  };
}

// 실시간 폴링 시 씬을 재생성하지 않고 해당 DOM 노드의 숫자/텍스트만 갱신한다.
function updateDashboardDom(status) {
  if (!document.querySelector('.thinq-dashboard-page')) return;
  const d = deriveDashboard(status);
  const set = (sel, text) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
  };
  set('[data-climate-temp]', `${d.temperature} °C`);
  set('[data-climate-humidity]', `${d.humidity}%`);
  set('[data-noise-title]', d.noiseState.title);
  set('[data-noise-sub]', d.noiseState.sub);
  const bar = document.querySelector('[data-noise-progress]');
  if (bar) bar.style.width = `${d.noiseProgress}%`;
  // 트리거 발동(위험) 시 소음 카드를 빨간 강조로 전환한다.
  document.querySelector('.dashboard-noise-card')?.classList.toggle('is-danger', isDangerActive());
}

export async function renderHomeDashboardPage() {
  let serverUnavailable = false;
  // 서버 연동 실패 시 더미(mock)를 보여주지 않고 빈 상태(→ 전부 '--')로 둔다.
  const status = await getCurrentHomeStatus().catch(() => {
    serverUnavailable = true;
    return {};
  });

  const { temperature, humidity, syncTime, noiseState, noiseProgress } = deriveDashboard(status);
  // 3D 홈에 표시할 가전 = 사용자의 민감가전(serviceLabel 보유). home-status.registeredDevices 는
  // 최근 측정값이 없으면 비어 있어, 항상 등록 가전 목록을 갖는 민감가전 설정을 소스로 쓴다.
  const sensitiveAppliances = await getSensitiveAppliances().catch(() => []);
  activeApplianceKeys = [...new Set(
    (sensitiveAppliances ?? [])
      .map((a) => GLB_KEY_BY_LABEL[a.serviceLabel] ?? GLB_KEY_BY_LABEL[a.name])
      .filter(Boolean)
  )];

  return `
    <section class="page thinq-dashboard-page" aria-label="메인 대시보드">
      ${householdHeader({
        status: `마지막 동기화: ${syncTime}`,
        extraHtml: `
          <div
            id="dashboard-server-state"
            class="hidden"
            data-server-unavailable="${serverUnavailable ? 'true' : 'false'}"
            data-last-sync="${escapeHtml(syncTime)}"
          ></div>
        `
      })}

      <div class="dashboard-main-grid">
        <button class="dashboard-home-card" data-dashboard-home-link type="button" aria-label="3D 홈 보기 열기">
          <div id="dashboard-home-scene" class="dashboard-home-scene" aria-label="집 내부 고정 상단 보기"></div>
          <p class="dashboard-sync">마지막 동기화: ${escapeHtml(syncTime)}</p>
        </button>

        <aside class="dashboard-summary-column" aria-label="홈 요약">
          <section class="dashboard-info-card dashboard-climate-card">
            <h2>실내 환경</h2>
            <strong data-climate-temp>${temperature} &deg;C</strong>
            <strong data-climate-humidity>${humidity}%</strong>
          </section>

          <section class="dashboard-info-card dashboard-noise-card">
            <h2>소음 상태</h2>
            <strong data-noise-title>${escapeHtml(noiseState.title)}</strong>
            <p data-noise-sub>${escapeHtml(noiseState.sub)}</p>
            <div class="dashboard-progress" aria-hidden="true">
              <span data-noise-progress style="width: ${noiseProgress}%"></span>
            </div>
          </section>

          <section class="dashboard-info-card dashboard-report-shortcut">
            <h2>일일 리포트</h2>
            <p>소음 요약과 반응을 확인하세요.</p>
            <a class="dashboard-report-button" href="#/reports">열기</a>
          </section>

          <button class="dashboard-info-card dashboard-reaction-card dashboard-reaction-card--positive" type="button" data-reaction="POSITIVE">
            <strong aria-hidden="true">
              <svg class="reaction-thumb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V9.8l4.4-6.6c1.2 0 2.1.9 1.9 2.1L12.5 9H18a2 2 0 0 1 2 2.3l-1.1 6.4A2.2 2.2 0 0 1 16.7 21z"/><path d="M7 9.8H4V21h3z"/></svg>
            </strong>
            <h2>좋아요</h2>
            <p data-reaction-status>피드백 저장</p>
          </button>

          <button class="dashboard-info-card dashboard-reaction-card dashboard-reaction-card--negative" type="button" data-reaction="NEGATIVE">
            <strong aria-hidden="true">
              <svg class="reaction-thumb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3v11.2l-4.4 6.6c-1.2 0-2.1-.9-1.9-2.1l.8-3.7H6a2 2 0 0 1-2-2.3l1.1-6.4A2.2 2.2 0 0 1 7.3 3z"/><path d="M17 14.2h3V3h-3z"/></svg>
            </strong>
            <h2>불편해요</h2>
            <p data-reaction-status>피드백 저장</p>
          </button>

        </aside>
      </div>
    </section>
  `;
}

export function mountHomeDashboardPage({ navigate } = {}) {
  cleanupHomeDashboardPage();

  const serverState = document.querySelector('#dashboard-server-state');
  if (serverState?.dataset.serverUnavailable === 'true') {
    const popupController = mountServerConnectionFailurePopup({ navigate });
    serverFailurePopupCleanup = popupController.cleanup;
    popupController.openPopup({
      lastSuccessfulSync: serverState.dataset.lastSync
    });
  }

  // 마운트 시점의 기존 알림을 baseline 으로 기록(이후 새 알림만 토스트).
  seenNotificationIds = null;
  primeNotificationBaseline();

  // ESP→Agent가 올리는 최신 home-status를 주기적으로 폴링해 소음/감지/환경 값을 실시간 갱신.
  // 같은 주기로 새 가전 소음 알림(로봇청소기/세탁기 80dB 초과)도 확인해 토스트로 노출한다.
  realtimeStop = startRealtimePoll(async () => {
    const status = await getCurrentHomeStatus().catch(() => null);
    if (status) lastStatus = status;
    updateDashboardDom(lastStatus ?? {});
    await pollNotifications();
  });

  const container = document.querySelector('#dashboard-home-scene');
  if (!container) return;

  const syncDashboardScene = (isMobile) => {
    if (isMobile) {
      dashboardSceneController?.dispose?.();
      dashboardSceneController = null;
      container.classList.remove('is-loading');
      return;
    }

    if (!dashboardSceneController) {
      dashboardSceneController = createDashboardHomeScene(container);
    }
    // 등록된 가전만 3D 홈에 노출한다.
    dashboardSceneController.setActiveAppliances?.(activeApplianceKeys);
  };

  const mediaQuery = window.matchMedia?.('(max-width: 640px)');
  if (mediaQuery) {
    const handleMediaChange = (event) => syncDashboardScene(event.matches);
    syncDashboardScene(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      dashboardSceneMediaCleanup = () => mediaQuery.removeEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
      dashboardSceneMediaCleanup = () => mediaQuery.removeListener(handleMediaChange);
    }
  } else {
    syncDashboardScene(false);
  }

  const homeLink = document.querySelector('[data-dashboard-home-link]');
  homeLink?.addEventListener('click', () => {
    navigate('#/three-home');
  });

  // 좋아요/불편해요: 누른 순간 측정 중인 모든 가전별 소음을 한 번에 기록(스냅샷).
  document.querySelectorAll('[data-reaction]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reactionType = btn.dataset.reaction;
      const statusEl = btn.querySelector('[data-reaction-status]');
      const prev = statusEl?.textContent;
      btn.disabled = true;
      if (statusEl) statusEl.textContent = '기록 중...';
      try {
        const res = await createReactionSnapshot({ reactionType });
        const count = res?.count ?? 0;
        if (statusEl) statusEl.textContent = count > 0 ? `기록됨 (${count}건)` : '측정값 없음';
      } catch (error) {
        if (statusEl) statusEl.textContent = '기록 실패';
      } finally {
        window.setTimeout(() => {
          if (statusEl) statusEl.textContent = prev ?? '피드백 저장';
          btn.disabled = false;
        }, 2000);
      }
    });
  });
}

export function cleanupHomeDashboardPage() {
  realtimeStop?.();
  realtimeStop = null;
  if (notificationToastTimer) {
    window.clearTimeout(notificationToastTimer);
    notificationToastTimer = null;
  }
  document.querySelector('.dashboard-alert-toast')?.remove();
  seenNotificationIds = null;
  dangerUntil = 0;
  lastStatus = null;
  serverFailurePopupCleanup?.();
  serverFailurePopupCleanup = null;
  dashboardSceneMediaCleanup?.();
  dashboardSceneMediaCleanup = null;
  dashboardSceneController?.dispose?.();
  dashboardSceneController = null;
}
