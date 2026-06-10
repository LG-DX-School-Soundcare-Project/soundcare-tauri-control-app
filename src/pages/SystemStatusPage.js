import { fetchSystemStatus } from '../api/systemStatus.js';
import { bindSettingsTabs, renderSettingsTabs } from '../components/settingsTabs.js';
import { escapeHtml } from '../utils/html.js';

let statusCards = [
  {
    title: 'Spring Boot 서버',
    state: 'Connected',
    tone: 'ok',
    meta: 'API 지연 시간 124 ms'
  },
  {
    title: '가전 제어 에이전트',
    state: 'Intermittent',
    tone: 'warn',
    meta: '마지막 하트비트 03:12'
  },
  {
    title: '로컬 분류 모델',
    state: 'OK',
    tone: 'ok',
    meta: '최근 분류 28건'
  },
  {
    title: '컴팩트 하드웨어 센서',
    state: 'Offline',
    tone: 'warn',
    meta: 'Arduino 수집 데이터 지연'
  }
];

let errorRows = [
  { time: '14:32', source: 'IoT Hub', error: '업로드 시간 초과', state: '재시도 중', action: '보기' },
  { time: '14:28', source: 'Sensor', error: '온도 데이터 지연', state: '경고', action: '보기' }
];

function statusPill(label, tone) {
  return `
    <span class="system-status-pill system-status-pill--${escapeHtml(tone)}">
      <i aria-hidden="true"></i>
      ${escapeHtml(label)}
    </span>
  `;
}

function toneFor(status) {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'OK' || normalized === 'ONLINE' || normalized === 'CONNECTED') return 'ok';
  if (
    normalized === 'WARN' ||
    normalized === 'WARNING' ||
    normalized === 'DEGRADED' ||
    normalized === 'STALE' ||
    normalized === 'OFFLINE' ||
    normalized === 'INTERMITTENT'
  ) {
    return 'warn';
  }
  return 'warn';
}

function displayStatus(status) {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'CONNECTED' || normalized === 'ONLINE' || normalized === 'OK') return '온라인';
  if (normalized === 'OFFLINE') return '오프라인';
  if (normalized === 'WARNING' || normalized === 'WARN') return '경고';
  if (normalized === 'DEGRADED') return '저하';
  if (normalized === 'STALE') return '지연';
  if (normalized === 'UNKNOWN') return '상태 없음';
  if (normalized === 'INTERMITTENT') return '불안정';
  return status ?? '-';
}

function buildStatusCards(status) {
  const backend = status.backend ?? {};
  const agent = status.agent ?? {};
  const model = status.model ?? {};
  const sensor = status.sensor ?? {};

  return [
    {
      title: 'Spring Boot 서버',
      state: backend.status ?? 'Unknown',
      tone: toneFor(backend.status),
      meta: `API 지연 시간 ${backend.latencyMs ?? '-'} ms`
    },
    {
      title: '가전 제어 에이전트',
      state: agent.status ?? 'Unknown',
      tone: toneFor(agent.status),
      meta: agent.lastSeenAt ? `마지막 확인 ${agent.lastSeenAt}` : '하트비트 없음'
    },
    {
      title: '로컬 분류 모델',
      state: model.status ?? 'Unknown',
      tone: toneFor(model.status),
      meta: `최근 분류 수 ${model.recentClassificationCount ?? 0}`
    },
    {
      title: '컴팩트 하드웨어 센서',
      state: sensor.status ?? 'Unknown',
      tone: toneFor(sensor.status),
      meta: sensor.lastEventAt ? `마지막 이벤트 ${sensor.lastEventAt}` : '센서 이벤트 없음'
    }
  ];
}

function buildErrorRows(status) {
  const rows = status.recentErrors ?? [];
  if (!rows.length) {
    return [{ time: '-', source: '시스템', error: '최근 경고 없음', state: 'OK', action: '-' }];
  }

  return rows.map((row) => ({
    time: row.created_at ?? row.createdAt ?? '-',
    source: row.source ?? '-',
    error: row.message ?? row.title ?? '-',
    state: row.state ?? row.severity ?? '-',
    action: '보기'
  }));
}

function statusCard(card) {
  return `
    <article class="system-card system-card--${escapeHtml(card.tone)}">
      <h2>${escapeHtml(card.title)}</h2>
      <div class="system-card-body">
        ${statusPill(displayStatus(card.state), card.tone)}
        <p>${escapeHtml(card.meta)}</p>
      </div>
    </article>
  `;
}

function errorRow(row) {
  return `
    <tr>
      <td>${escapeHtml(row.time)}</td>
      <td>${escapeHtml(row.source)}</td>
      <td>${escapeHtml(row.error)}</td>
      <td>${escapeHtml(row.state)}</td>
      <td>${escapeHtml(row.action)}</td>
    </tr>
  `;
}

export async function renderSystemStatusPage() {
  const systemStatus = await fetchSystemStatus();
  statusCards = buildStatusCards(systemStatus);
  errorRows = buildErrorRows(systemStatus);

  const overall = systemStatus.overallStatus ?? 'DEGRADED';
  const overallTone = toneFor(overall);

  return `
    <section class="page system-status-page" aria-label="오류 및 연결 상태 화면">
      <header class="system-page-header">
        <h1>시스템 상태</h1>
        <p>서버, 기기, 모델, 업로드 데이터 로딩 문제를 확인합니다.</p>
      </header>

      <div class="system-status-shell">
        <aside class="settings-category-panel system-category-panel" aria-label="시스템 설정 카테고리">
          ${renderSettingsTabs('system')}
        </aside>

        <div class="system-status-layout">
          <section class="system-overall-banner" aria-label="전체 시스템 상태">
            <div>
              <h2>전체 시스템 상태: ${escapeHtml(displayStatus(overall))}</h2>
              <p>백엔드, 에이전트, 센서, 모델, 업로드 상태를 한 번에 확인합니다.</p>
            </div>
            <div class="system-banner-actions">
              ${statusPill(`백엔드 ${displayStatus(systemStatus.backend?.status ?? '-')}`, toneFor(systemStatus.backend?.status))}
              ${statusPill(`업로드 ${displayStatus(systemStatus.uploadQueue?.status ?? '-')}`, overallTone)}
            </div>
          </section>

          ${statusCards.map(statusCard).join('')}

          <aside class="system-guide-card">
            <h2>문제 해결 가이드</h2>
            <ol>
              <li>백엔드 상태 대시보드를 확인합니다.</li>
              <li>IoT Hub 토큰 유효성을 확인합니다.</li>
              <li>민감한 토큰은 노출되지 않도록 주의합니다.</li>
              <li>재시도 대기열과 로컬 적재 상태를 다시 확인합니다.</li>
            </ol>
            <button id="system-retry-button" class="system-retry-button" type="button">연결 재시도</button>
            <p id="system-retry-status" class="system-retry-status" aria-live="polite"></p>
          </aside>

          <section class="system-error-log">
            <h2>최근 오류 로그</h2>
            <table>
              <thead>
                <tr>
                  <th>시간</th>
                  <th>출처</th>
                  <th>오류</th>
                  <th>상태</th>
                  <th>동작</th>
                </tr>
              </thead>
              <tbody>
                ${errorRows.map(errorRow).join('')}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </section>
  `;
}

export function mountSystemStatusPage({ navigate } = {}) {
  bindSettingsTabs(navigate);

  document.querySelector('#system-retry-button')?.addEventListener('click', () => {
    const status = document.querySelector('#system-retry-status');
    if (status) {
      status.textContent = '재시도를 요청했습니다. 잠시 후 대기열을 다시 확인합니다.';
    }
  });
}
