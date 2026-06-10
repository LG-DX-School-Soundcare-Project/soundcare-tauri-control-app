export function renderLowConfidenceNoticePopup() {
  return `
    <div id="low-confidence-popup" class="low-confidence-backdrop hidden" aria-hidden="true">
      <section class="low-confidence-modal" role="dialog" aria-modal="true" aria-labelledby="low-confidence-title">
        <h2 id="low-confidence-title">낮은 신뢰도 안내</h2>
        <p class="low-confidence-subtitle">이벤트나 회피 동작은 생성되지 않았습니다.</p>

        <div class="low-confidence-metrics">
          <div class="low-confidence-card">
            <strong>예측된 model_label</strong>
            <p id="low-confidence-model">-</p>
          </div>
          <div class="low-confidence-card low-confidence-card--value">
            <strong>신뢰도</strong>
            <p id="low-confidence-value">-</p>
          </div>
          <div class="low-confidence-card low-confidence-card--value">
            <strong>기준값</strong>
            <p id="low-confidence-threshold">-</p>
          </div>
        </div>

        <div class="low-confidence-message">
          <p id="low-confidence-message">
            예측 신뢰도가 필요한 기준값보다 낮아 확정 이벤트로 처리되지 않았습니다.
          </p>
        </div>

        <div class="low-confidence-actions">
          <button type="button" id="low-confidence-settings" class="low-confidence-secondary">설정 조정</button>
          <button type="button" id="low-confidence-close" class="low-confidence-primary">닫기</button>
        </div>
      </section>
    </div>
  `;
}

export function mountLowConfidenceNoticePopup({ navigate } = {}) {
  let root = document.querySelector('#low-confidence-popup-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'low-confidence-popup-root';
    document.body.appendChild(root);
  }

  root.innerHTML = renderLowConfidenceNoticePopup();

  const popup = root.querySelector('#low-confidence-popup');
  const model = root.querySelector('#low-confidence-model');
  const value = root.querySelector('#low-confidence-value');
  const threshold = root.querySelector('#low-confidence-threshold');
  const settingsButton = root.querySelector('#low-confidence-settings');
  const closeButton = root.querySelector('#low-confidence-close');

  const closePopup = () => {
    popup?.classList.add('hidden');
    popup?.setAttribute('aria-hidden', 'true');
  };

  const openPopup = ({ modelLabel, confidence, thresholdValue } = {}) => {
    if (model) model.textContent = modelLabel ?? '-';
    if (value) value.textContent = Number(confidence ?? 0).toFixed(2);
    if (threshold) threshold.textContent = Number(thresholdValue ?? 0).toFixed(2);
    popup?.classList.remove('hidden');
    popup?.setAttribute('aria-hidden', 'false');
  };

  popup?.addEventListener('click', (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });

  closeButton?.addEventListener('click', closePopup);

  settingsButton?.addEventListener('click', () => {
    closePopup();
    navigate?.('#/settings');
  });

  const cleanup = () => {
    root?.remove();
  };

  return { openPopup, closePopup, cleanup };
}
