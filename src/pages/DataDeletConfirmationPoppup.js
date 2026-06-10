export function renderDataDeleteConfirmationPopup() {
  return `
    <div id="data-delete-confirmation-popup" class="data-delete-backdrop hidden" aria-hidden="true">
      <section class="data-delete-modal" role="dialog" aria-modal="true" aria-labelledby="data-delete-title">
        <h2 id="data-delete-title">Delete selected data?</h2>
        <p class="data-delete-subtitle">This action may remove stored records.</p>

        <div class="data-delete-card">
          <p>Target: 28 events, 7 reactions, 1 report, local logs</p>
        </div>

        <div class="data-delete-card data-delete-card--danger">
          <p>Deleted data may not be recoverable unless a backup policy exists.</p>
        </div>

        <label class="data-delete-input-wrap">
          <span class="hidden">Type DELETE to confirm high-risk deletion</span>
          <input id="data-delete-confirm-input" type="text" placeholder="Type DELETE to confirm high-risk deletion" />
        </label>

        <p id="data-delete-feedback" class="data-delete-feedback" aria-live="polite"></p>

        <div class="data-delete-actions">
          <a href="#/settings" class="data-delete-policy-link">Data retention policy</a>
          <div class="data-delete-button-row">
            <button type="button" id="data-delete-cancel" class="data-delete-secondary">Cancel</button>
            <button type="button" id="data-delete-confirm" class="data-delete-primary">Delete</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function mountDataDeleteConfirmationPopup({ onConfirm } = {}) {
  let root = document.querySelector('#data-delete-confirmation-popup-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'data-delete-confirmation-popup-root';
    document.body.appendChild(root);
  }

  root.innerHTML = renderDataDeleteConfirmationPopup();

  const popup = root.querySelector('#data-delete-confirmation-popup');
  const input = root.querySelector('#data-delete-confirm-input');
  const feedback = root.querySelector('#data-delete-feedback');
  const confirmButton = root.querySelector('#data-delete-confirm');
  const cancelButton = root.querySelector('#data-delete-cancel');

  const closePopup = () => {
    popup?.classList.add('hidden');
    popup?.setAttribute('aria-hidden', 'true');
    if (input) input.value = '';
    if (feedback) feedback.textContent = '';
    if (confirmButton) confirmButton.disabled = false;
    if (confirmButton) confirmButton.textContent = 'Delete';
  };

  const openPopup = () => {
    popup?.classList.remove('hidden');
    popup?.setAttribute('aria-hidden', 'false');
    if (feedback) feedback.textContent = '';
    input?.focus();
  };

  popup?.addEventListener('click', (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });

  cancelButton?.addEventListener('click', closePopup);

  confirmButton?.addEventListener('click', async () => {
    const confirmText = input?.value.trim();
    if (confirmText !== 'DELETE') {
      if (feedback) feedback.textContent = 'Please type DELETE to continue.';
      input?.focus();
      return;
    }

    if (feedback) feedback.textContent = '';
    confirmButton.disabled = true;
    confirmButton.textContent = 'Deleting...';

    try {
      await onConfirm?.(confirmText);
      closePopup();
    } catch (error) {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Delete';
      if (feedback) feedback.textContent = error.message;
    }
  });

  const cleanup = () => {
    root?.remove();
  };

  return { openPopup, closePopup, cleanup };
}
