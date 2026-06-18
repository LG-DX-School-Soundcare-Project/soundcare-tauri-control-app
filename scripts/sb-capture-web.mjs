// 스토리보드용 데모 화면 캡쳐 (웹/데스크톱 레이아웃). drama_web / ad_web 양쪽에 저장.
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:5300/';
const OUT = 'C:/Users/choho/Documents/storyboard_shots';
const DRAMA = `${OUT}/drama_web`;
const AD = `${OUT}/ad_web`;
for (const d of [DRAMA, AD]) fs.mkdirSync(d, { recursive: true });
const BOTH = [DRAMA, AD];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[web]', ...a);

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
async function newPage() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false });
  return p;
}
const killOverlay = (page, hideChrome = false) => page.evaluate((hc) => {
  document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove());
  if (hc) document.querySelectorAll('.sidebar, .mobile-bottom-nav').forEach((e) => { e.style.visibility = 'hidden'; });
}, hideChrome).catch(() => {});
const saveTo = async (page, name, opts = {}) => {
  await killOverlay(page, !!opts.fullPage);
  for (const f of BOTH) await page.screenshot({ path: `${f}/${name}.png`, fullPage: !!opts.fullPage });
  log('saved', name);
};
async function go(page, hash, wait = 2500) { await page.evaluate((h) => { window.location.hash = h; }, hash); await sleep(wait); }

const page = await newPage();
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

// loading (fresh page, splash visible)
try {
  const lp = await newPage();
  const nav = lp.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1100);
  await lp.evaluate(() => document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove())).catch(() => {});
  await lp.screenshot({ path: `${DRAMA}/loading.png` });
  await lp.screenshot({ path: `${AD}/loading.png` });
  log('saved loading'); await nav.catch(() => {}); await lp.close();
} catch (e) { log('loading failed', e.message); }

for (let i=0;i<45;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }
await sleep(800);

await go(page, '#/home', 3500); await saveTo(page, 'home-main');
try { await page.evaluate(() => document.querySelector('[data-reaction="POSITIVE"]')?.click()); await sleep(900); await saveTo(page, 'home-reaction-recorded'); } catch (e) { log('reaction', e.message); }

await go(page, '#/three-home', 6500); await saveTo(page, '3d-view');
await go(page, '#/devices', 3000); await saveTo(page, 'device-list');

try {
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find((x)=>x.textContent.trim()==='기기 추가'); b?.click(); });
  await sleep(1200); await saveTo(page, 'device-add-popup');
  await page.evaluate(() => document.querySelector('[data-device-add-cancel]')?.click()); await sleep(400);
} catch (e) { log('add', e.message); }

await go(page, '#/reports', 3500); await saveTo(page, 'report-top');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(800); await saveTo(page, 'report-gpt-button');
await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300); await saveTo(page, 'report-full', { fullPage: true });

try {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.querySelector('[data-report-period-trigger]')?.click()); await sleep(500);
  await page.evaluate(() => document.querySelector('[data-report-period-option="최근 3일"]')?.click()); await sleep(1200);
  await saveTo(page, 'report-period-3day');
} catch (e) { log('period', e.message); }

try {
  await go(page, '#/reports', 3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(500);
  await page.evaluate(() => document.querySelector('#generate-gpt-report')?.click()); await sleep(1200);
  await saveTo(page, 'gpt-consent-popup');
  // 실제 생성
  await page.evaluate(() => { const cb=document.querySelector('#gpt-consent-checkbox'); if(cb) cb.checked=true; document.querySelector('#gpt-consent-agree')?.click(); });
  let ok=false; for (let i=0;i<80;i++){ if((await page.evaluate(()=>location.hash)).includes('gpt-detailed')){ok=true;break;} await sleep(1000); }
  log('gpt generated?', ok); await sleep(3000);
  await page.evaluate(() => window.scrollTo(0,0));
  await saveTo(page, 'gpt-report-summary');
  await saveTo(page, 'gpt-report-full', { fullPage: true });
  // 상세 팝업만 (모달 패널 요소)
  await page.evaluate(() => document.querySelector('[data-view-report]')?.click()); await sleep(1000);
  await page.evaluate(() => {
    document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove());
    const panel=document.querySelector('.gpt-report-modal__panel'); if(panel){panel.style.maxHeight='none';panel.style.height='auto';}
    const body=document.querySelector('.gpt-report-modal__body'); if(body){body.style.maxHeight='none';body.style.overflow='visible';}
  });
  await sleep(400);
  const panel = await page.$('.gpt-report-modal__panel');
  if (panel) { for (const f of BOTH) await panel.screenshot({ path: `${f}/gpt-report-detail.png` }); log('saved gpt-report-detail'); }
} catch (e) { log('gpt', e.message); }

async function deviceDetail(id, base, { sensitive=false, wait=6000 } = {}) {
  await go(page, `#/devices/${id}`, wait); await saveTo(page, base);
  if (sensitive) { await page.evaluate(() => document.querySelector('[data-sensitive-toggle]')?.click()); await sleep(900); await saveTo(page, `${base}-sensitive-on`); }
}
await deviceDetail('rdev-washer', 'device-washer', { sensitive: true, wait: 6500 });
await deviceDetail('rdev-robot', 'device-robot', { sensitive: true, wait: 6000 });
await deviceDetail('rdev-hub', 'device-hub', { wait: 12000 });

await browser.close();
log('ALL DONE');
