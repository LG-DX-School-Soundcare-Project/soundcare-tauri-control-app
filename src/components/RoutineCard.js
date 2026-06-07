export function RoutineCard(routine, { compact = false } = {}) {
  const id = routine.id ?? routine.routineId;
  const reason = routine.reason ?? routine.description ?? routine.triggerRule ?? '-';
  const targetServiceLabel = routine.targetServiceLabel ?? routine.serviceLabel ?? '-';
  return `
    <article class="routine-card" data-routine-id="${id}">
      <div>
        <span class="badge">${routine.status}</span>
        <strong>${routine.title}</strong>
        <p>${reason}</p>
        <small>대상: ${targetServiceLabel}</small>
      </div>
      ${compact ? '' : `
        <div class="routine-card__actions">
          <button data-action="apply-routine" data-routine-id="${id}">적용</button>
          <button class="secondary" data-action="dismiss-routine" data-routine-id="${id}">숨기기</button>
        </div>
      `}
    </article>
  `;
}
