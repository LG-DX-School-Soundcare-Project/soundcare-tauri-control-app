export function ReportCard(report) {
  return `
    <article class="report-card">
      <span>${report.period ?? '기간 미지정'}</span>
      <h3>${report.summary ?? '요약 리포트가 아직 없습니다.'}</h3>
      <dl>
        <div><dt>이벤트 수</dt><dd>${report.eventCount ?? 0}</dd></div>
        <div><dt>부정 반응</dt><dd>${report.negativeReactionCount ?? 0}</dd></div>
        <div><dt>주요 소음원</dt><dd>${report.topServiceLabel ?? '-'}</dd></div>
      </dl>
    </article>
  `;
}
