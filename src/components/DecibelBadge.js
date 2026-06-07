export function getDecibelTone(decibel) {
  if (decibel >= 70) return 'danger';
  if (decibel >= 60) return 'warning';
  return 'safe';
}

export function DecibelBadge({ decibel, label = '현재 dB' }) {
  const tone = getDecibelTone(Number(decibel));
  return `
    <div class="decibel-badge decibel-badge--${tone}" aria-label="${label}">
      <span>${label}</span>
      <strong>${Number(decibel).toFixed(1)} dB</strong>
    </div>
  `;
}
