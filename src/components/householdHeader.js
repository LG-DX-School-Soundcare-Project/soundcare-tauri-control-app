import { escapeHtml } from '../utils/html.js';

export const HOUSEHOLD_TITLE = '조호성 님의 Home';

export function householdHeader({ headerClass = '', status = '', extraHtml = '' } = {}) {
  const classes = ['dashboard-household-header', headerClass].filter(Boolean).join(' ');
  return `
    <header class="${classes}">
      <h1 class="dashboard-desktop-title">${escapeHtml(HOUSEHOLD_TITLE)}</h1>
      <div class="dashboard-mobile-title">
        <h1>${escapeHtml(HOUSEHOLD_TITLE)}</h1>
      </div>
      <p class="dashboard-mobile-sync">${escapeHtml(status)}</p>
      ${extraHtml}
    </header>
  `;
}
