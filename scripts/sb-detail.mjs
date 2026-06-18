// GPT 상세 리포트 "팝업(모달)"만 깔끔히 캡쳐. 배경/AdGuard 제외.
import puppeteer from 'puppeteer';
import fs from 'node:fs';
const URL = 'http://127.0.0.1:5300/';
const DRAMA = 'C:/Users/choho/Documents/storyboard_shots/drama';
const AD = 'C:/Users/choho/Documents/storyboard_shots/ad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
const page = await browser.newPage();
// 모달 전체 내용이 한 컷에 담기도록 세로로 넉넉한 모바일 뷰포트
await page.setViewport({ width: 390, height: 1700, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
for (let i=0;i<45;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }

// 리포트 새로 생성
await page.evaluate(() => { localStorage.removeItem('soundcare.lastDetailedReportText'); localStorage.removeItem('soundcare.lastDetailedReportId'); location.hash = '#/reports'; });
await sleep(3000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(500);
await page.evaluate(() => document.querySelector('#generate-gpt-report')?.click());
await sleep(1200);
await page.evaluate(() => { const cb=document.querySelector('#gpt-consent-checkbox'); if(cb) cb.checked=true; document.querySelector('#gpt-consent-agree')?.click(); });
let ok=false;
for (let i=0;i<80;i++){ if((await page.evaluate(()=>location.hash)).includes('gpt-detailed')){ok=true;break;} await sleep(1000); }
console.log('generated?', ok);
await sleep(2500);

// 상세 리포트 보기 모달 열기
await page.evaluate(() => document.querySelector('[data-view-report]')?.click());
await sleep(1200);

// 팝업 전체 내용이 보이도록 높이 제한 해제 + AdGuard 노드 제거
await page.evaluate(() => {
  document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove());
  const panel = document.querySelector('.gpt-report-modal__panel');
  if (panel) { panel.style.maxHeight = 'none'; panel.style.height = 'auto'; }
  const body = document.querySelector('.gpt-report-modal__body');
  if (body) { body.style.maxHeight = 'none'; body.style.overflow = 'visible'; }
});
await sleep(400);

const panel = await page.$('.gpt-report-modal__panel');
if (!panel) { console.log('NO PANEL'); await browser.close(); process.exit(1); }
for (const f of [DRAMA, AD]) {
  await panel.screenshot({ path: `${f}/gpt-report-detail.png` });
  // 불필요한 전체 컷 삭제
  for (const stale of ['gpt-report-detail-full.png']) {
    const p = `${f}/${stale}`;
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log('deleted', p); }
  }
}
console.log('saved gpt-report-detail (popup only) to both folders');
await browser.close();
console.log('DONE');
