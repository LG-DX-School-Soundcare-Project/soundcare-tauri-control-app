export function renderGPTConsentWithdrawalPopup() {
  return `
    <div id="gpt-withdraw-popup" class="gpt-withdraw-backdrop hidden" aria-hidden="true">
      <section class="gpt-withdraw-modal" role="dialog" aria-modal="true" aria-labelledby="gpt-withdraw-title">
        <h2 id="gpt-withdraw-title">Withdraw GPT consent?</h2>
        <p class="gpt-withdraw-subtitle">Confirm whether future GPT detailed report generation should stop.</p>

        <div class="gpt-withdraw-card">
          <strong>Current consent status</strong>
          <p>Granted for GPT detailed reports</p>
        </div>

        <div class="gpt-withdraw-card">
          <p>Future GPT report generation will require explicit consent again before any summarized data is sent.</p>
        </div>

        <div class="gpt-withdraw-card">
          <p>Existing generated reports are not automatically deleted. Manage them from the report list.</p>
        </div>

        <p id="gpt-withdraw-feedback" class="gpt-withdraw-feedback" aria-live="polite"></p>

        <div class="gpt-withdraw-actions">
          <a href="#/reports" id="gpt-withdraw-report-link" class="gpt-withdraw-link">Open generated report list</a>
          <div class="gpt-withdraw-button-row">
            <button type="button" id="gpt-withdraw-cancel" class="gpt-withdraw-secondary">Cancel</button>
            <button type="button" id="gpt-withdraw-confirm" class="gpt-withdraw-primary">Withdraw consent</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function mountGPTConsentWithdrawalPopup({ navigate, onConfirm } = {}) {
  let root = document.querySelector('#gpt-withdraw-popup-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'gpt-withdraw-popup-root';
    document.body.appendChild(root);
  }

  root.innerHTML = renderGPTConsentWithdrawalPopup();

  const popup = root.querySelector('#gpt-withdraw-popup');
  const feedback = root.querySelector('#gpt-withdraw-feedback');
  const reportLink = root.querySelector('#gpt-withdraw-report-link');
  const cancelButton = root.querySelector('#gpt-withdraw-cancel');
  const confirmButton = root.querySelector('#gpt-withdraw-confirm');

  const closePopup = () => {
    popup?.classList.add('hidden');
    popup?.setAttribute('aria-hidden', 'true');
    if (feedback) feedback.textContent = '';
    if (confirmButton) confirmButton.disabled = false;
    if (confirmButton) confirmButton.textContent = 'Withdraw consent';
  };

  const openPopup = () => {
    popup?.classList.remove('hidden');
    popup?.setAttribute('aria-hidden', 'false');
    if (feedback) feedback.textContent = '';
  };

  popup?.addEventListener('click', (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });

  reportLink?.addEventListener('click', (event) => {
    event.preventDefault();
    closePopup();
    navigate?.('#/reports');
  });

  cancelButton?.addEventListener('click', closePopup);

  confirmButton?.addEventListener('click', async () => {
    if (feedback) feedback.textContent = '';
    confirmButton.disabled = true;
    confirmButton.textContent = 'Withdrawing...';

    try {
      await onConfirm?.();
      closePopup();
    } catch (error) {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Withdraw consent';
      if (feedback) feedback.textContent = error.message;
    }
  });

  const cleanup = () => {
    root?.remove();
  };

  return { openPopup, closePopup, cleanup };
}
