import { escapeHtml } from '../utils/html.js';
import { getRecentNotifications, markNotificationRead } from '../api/notificationApi.js';

// 알림 종류별 아이콘(이모지). 데모용 하드코딩 매핑.
const ICON = {
  LOW_NOISE_MODE: '🔉',
  ROUTINE_CREATED: '🔉',
  ROBOT_AVOIDANCE: '🤖',
  NON_CONTROLLABLE_WARNING: '⚠️',
  BIG_NOISE: '⚠️',
  SENSITIVE_APPLIANCE: '🔊'
};
const iconFor = (type) => ICON[type] || '🔔';

export function notificationBell() {
  return `
    <div class="noti" data-noti-root>
      <button type="button" class="noti-bell" data-noti-toggle aria-label="알림" aria-expanded="false">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
        </svg>
        <span class="noti-badge hidden" data-noti-badge></span>
      </button>
      <div class="noti-panel hidden" data-noti-panel role="dialog" aria-label="알림 목록">
        <header class="noti-panel__head">
          <strong>알림</strong>
          <button type="button" class="noti-readall" data-noti-readall>모두 읽음</button>
        </header>
        <ul class="noti-list" data-noti-list></ul>
      </div>
    </div>
  `;
}

function itemHtml(n) {
  return `
    <li class="noti-item ${n.read ? 'is-read' : 'is-unread'}" data-noti-id="${escapeHtml(n.id)}">
      <span class="noti-item__icon" aria-hidden="true">${iconFor(n.type)}</span>
      <div class="noti-item__body">
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.message)}</p>
        <small>${escapeHtml(n.timeLabel || '')}</small>
      </div>
      <button type="button" class="noti-item__read" data-noti-read aria-label="읽음 처리">읽음</button>
    </li>
  `;
}

// 외부 클릭 닫기 핸들러(마운트 간 누수 방지용 모듈 레퍼런스).
let docHandler = null;

export async function mountNotificationBell() {
  const root = document.querySelector('[data-noti-root]');
  if (!root) return;
  const toggle = root.querySelector('[data-noti-toggle]');
  const panel = root.querySelector('[data-noti-panel]');
  const listEl = root.querySelector('[data-noti-list]');
  const badge = root.querySelector('[data-noti-badge]');

  let items = [];
  try {
    items = (await getRecentNotifications(10)) || [];
  } catch (error) {
    items = [];
  }

  const render = () => {
    listEl.innerHTML = items.length
      ? items.map(itemHtml).join('')
      : '<li class="noti-empty">새 알림이 없습니다.</li>';
    const unread = items.filter((n) => !n.read).length;
    if (unread > 0) {
      badge.textContent = String(unread);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    listEl.querySelectorAll('[data-noti-read]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('[data-noti-id]')?.dataset.notiId;
        const it = items.find((x) => x.id === id);
        if (it) {
          it.read = true;
          markNotificationRead(id).catch(() => {});
          render();
        }
      });
    });
  };
  render();

  const close = () => { panel.classList.add('hidden'); toggle.setAttribute('aria-expanded', 'false'); };
  const open = () => { panel.classList.remove('hidden'); toggle.setAttribute('aria-expanded', 'true'); };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.classList.contains('hidden')) open(); else close();
  });
  root.querySelector('[data-noti-readall]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    items.forEach((n) => { if (!n.read) { n.read = true; markNotificationRead(n.id).catch(() => {}); } });
    render();
  });

  // 패널 밖 클릭 시 닫기 (이전 핸들러 제거 후 등록)
  if (docHandler) document.removeEventListener('click', docHandler);
  docHandler = (e) => { if (!root.contains(e.target)) close(); };
  document.addEventListener('click', docHandler);
}
