// 3D 모델 로딩 중 표시하는 liquid glass orb 오버레이 (배경 없이 orb만, transparent)
import './liquidGlassLoader.js';

export function attachModelLoadingOrb(container) {
  if (!container) return { remove: () => {} };

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const overlay = document.createElement('div');
  overlay.className = 'model-loading-orb';
  overlay.setAttribute('aria-hidden', 'true');

  const orb = document.createElement('liquid-glass-loader');
  orb.setAttribute('transparent', '');
  overlay.appendChild(orb);
  container.appendChild(overlay);

  // 씬이 is-loading 클래스를 제거하면(로드 완료/실패) 자동으로 정리
  const cleanup = () => {
    observer.disconnect();
    overlay.remove();
  };

  const observer = new MutationObserver(() => {
    if (!container.classList.contains('is-loading') || !container.contains(overlay)) {
      cleanup();
    }
  });
  observer.observe(container, { attributes: true, attributeFilter: ['class'], childList: true });

  return { remove: cleanup };
}
