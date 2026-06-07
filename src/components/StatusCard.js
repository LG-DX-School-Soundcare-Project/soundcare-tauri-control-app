export function StatusCard({ title, value, meta = '', tone = 'default' }) {
  return `
    <article class="status-card status-card--${tone}">
      <span class="status-card__title">${title}</span>
      <strong class="status-card__value">${value}</strong>
      ${meta ? `<small class="status-card__meta">${meta}</small>` : ''}
    </article>
  `;
}
