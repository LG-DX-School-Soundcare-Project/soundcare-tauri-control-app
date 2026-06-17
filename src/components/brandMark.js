// HEAR:O 브랜드 마크: 확정 로고 이미지(집 + 사운드웨이브 픽토그램).
// uid/extraClass 인자는 기존 호출부 호환을 위해 유지한다.
export function brandMark(uid = 'default', extraClass = '') {
  return `<img class="brand-mark ${extraClass}" src="/assets/brand/hearo-mark.png" alt="HEAR:O" decoding="async" />`;
}
