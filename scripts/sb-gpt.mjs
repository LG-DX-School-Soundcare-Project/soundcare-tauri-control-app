import puppeteer from 'puppeteer';
import fs from 'node:fs';
const URL = 'http://127.0.0.1:5300/';
const DRAMA = 'C:/Users/choho/Documents/storyboard_shots/drama';
const AD = 'C:/Users/choho/Documents/storyboard_shots/ad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = async (page, name, full=false) => { for (const f of [DRAMA, AD]) await page.screenshot({ path: `${f}/${name}.png`, fullPage: full }); console.log('saved', name); };

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
for (let i=0;i<45;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }
// 기존 저장본 제거 → 새로 생성
await page.evaluate(() => { localStorage.removeItem('soundcare.lastDetailedReportText'); localStorage.removeItem('soundcare.lastDetailedReportId'); });
await page.evaluate(() => { location.hash = '#/reports'; });
await sleep(3000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(500);
await page.evaluate(() => document.querySelector('#generate-gpt-report')?.click());
await sleep(1200);
await page.evaluate(() => { const cb=document.querySelector('#gpt-consent-checkbox'); if(cb) cb.checked=true; document.querySelector('#gpt-consent-agree')?.click(); });
let ok=false;
for (let i=0;i<80;i++){ const h=await page.evaluate(()=>location.hash); if(h.includes('gpt-detailed')){ok=true;break;} await sleep(1000); }
console.log('generated?', ok);
await sleep(3500);
const txt = await page.evaluate(() => (localStorage.getItem('soundcare.lastDetailedReportText')||'').slice(0,120));
console.log('storedText:', JSON.stringify(txt));
await page.evaluate(() => window.scrollTo(0,0));
await sleep(300);
await save(page, 'gpt-report-summary');
await save(page, 'gpt-report-full', true);
// 상세 리포트 보기 모달
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,a')].find((x) => /상세 리포트 보기|상세 리포트|상세하게/.test(x.textContent || ''));
  b?.click();
});
await sleep(1500);
await save(page, 'gpt-report-detail');
await save(page, 'gpt-report-detail-full', true);
await browser.close();
console.log('DONE');
