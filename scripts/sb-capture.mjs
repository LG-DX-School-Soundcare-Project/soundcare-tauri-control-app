// 스토리보드용 데모 화면 캡쳐 (모바일 세로). drama / ad 폴더 양쪽에 저장.
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:5300/';
const OUT = 'C:/Users/choho/Documents/storyboard_shots';
const DRAMA = `${OUT}/drama`;
const AD = `${OUT}/ad`;
for (const d of [OUT, DRAMA, AD]) fs.mkdirSync(d, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[cap]', ...a);

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'
  ]
});

async function newMobilePage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  return page;
}

async function waitSplashGone(page) {
  for (let i = 0; i < 45; i++) {
    if (!(await page.$('#app-splash'))) return;
    await sleep(700);
  }
}

async function go(page, hash, wait = 2500) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await sleep(wait);
}

// 시스템 AdGuard가 <html>에 주입하는 어시스턴트(우하단 녹색 방패) 노드를 제거.
const killOverlay = (page) => page.evaluate(() => {
  document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove());
}).catch(() => {});

const saveTo = async (page, folders, name, opts = {}) => {
  await killOverlay(page);
  for (const f of folders) {
    await page.screenshot({ path: `${f}/${name}.png`, fullPage: !!opts.fullPage });
  }
  log('saved', name, '->', folders.map((f) => f.split('/').pop()).join(','));
};
const BOTH = [DRAMA, AD];

// ---- main page ----
const page = await newMobilePage();
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

// 0) loading screen (splash) — capture on a fresh page before it dismisses
try {
  const lp = await newMobilePage();
  const nav = lp.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1100);
  await lp.evaluate(() => document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove())).catch(() => {});
  await lp.screenshot({ path: `${DRAMA}/loading.png` });
  await lp.screenshot({ path: `${AD}/loading.png` });
  log('saved loading');
  await nav.catch(() => {});
  await lp.close();
} catch (e) { log('loading failed', e.message); }

await waitSplashGone(page);
await sleep(800);

// 1) home main
await go(page, '#/home', 3500);
await saveTo(page, BOTH, 'home-main');

// 2) home — 긍정 버튼 누른 직후 "기록됨"
try {
  await page.evaluate(() => document.querySelector('[data-reaction="POSITIVE"]')?.click());
  await sleep(900);
  await saveTo(page, BOTH, 'home-reaction-recorded');
} catch (e) { log('reaction failed', e.message); }

// 3) 3D view
await go(page, '#/three-home', 6500);
await saveTo(page, BOTH, '3d-view');

// 4) device list
await go(page, '#/devices', 3000);
await saveTo(page, BOTH, 'device-list');

// 5) device add popup
try {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '기기 추가');
    b?.click();
  });
  await sleep(1200);
  await saveTo(page, BOTH, 'device-add-popup');
  // close
  await page.evaluate(() => document.querySelector('[data-device-add-cancel]')?.click());
  await sleep(400);
} catch (e) { log('device-add failed', e.message); }

// 6) report top + scrolled + full
await go(page, '#/reports', 3500);
await saveTo(page, BOTH, 'report-top');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(800);
await saveTo(page, BOTH, 'report-gpt-button');
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(300);
await saveTo(page, BOTH, 'report-full', { fullPage: true });

// 7) report period = 최근 3일 (drama)
try {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.querySelector('[data-report-period-trigger]')?.click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('[data-report-period-option="최근 3일"]')?.click());
  await sleep(1200);
  await saveTo(page, BOTH, 'report-period-3day');
} catch (e) { log('period failed', e.message); }

// 8) GPT consent popup
try {
  await go(page, '#/reports', 3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(500);
  await page.evaluate(() => document.querySelector('#generate-gpt-report')?.click());
  await sleep(1200);
  await saveTo(page, BOTH, 'gpt-consent-popup');
} catch (e) { log('consent failed', e.message); }

// 9) GPT 실제 생성 → 상세 리포트 페이지 (실호출, 시간 소요)
try {
  log('generating GPT report (live)...');
  await page.evaluate(() => {
    const cb = document.querySelector('#gpt-consent-checkbox'); if (cb) cb.checked = true;
    document.querySelector('#gpt-consent-agree')?.click();
  });
  // hash가 gpt-detailed로 바뀔 때까지 최대 70초 대기
  let ok = false;
  for (let i = 0; i < 70; i++) {
    const h = await page.evaluate(() => location.hash);
    if (h.includes('gpt-detailed')) { ok = true; break; }
    await sleep(1000);
  }
  log('gpt generated?', ok);
  await sleep(3500);
  await saveTo(page, BOTH, 'gpt-report-summary');
  await saveTo(page, BOTH, 'gpt-report-full', { fullPage: true });
  // 상세/PDF 모달 열기 시도
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,a')].find((x) => /상세|PDF|전체|자세히/i.test(x.textContent || ''));
    b?.click();
  });
  await sleep(1500);
  await saveTo(page, BOTH, 'gpt-report-detail', { fullPage: true });
} catch (e) { log('gpt gen failed', e.message); }

// 10) device details + sensitive toggles
async function deviceDetail(id, base, { sensitive = false, wait = 6000 } = {}) {
  await go(page, `#/devices/${id}`, wait);
  await saveTo(page, BOTH, base);
  if (sensitive) {
    await page.evaluate(() => document.querySelector('[data-sensitive-toggle]')?.click());
    await sleep(900);
    await saveTo(page, BOTH, `${base}-sensitive-on`);
  }
}
await deviceDetail('rdev-washer', 'device-washer', { sensitive: true, wait: 6500 });
await deviceDetail('rdev-robot', 'device-robot', { sensitive: true, wait: 6000 });
await deviceDetail('rdev-hub', 'device-hub', { sensitive: false, wait: 12000 });

await browser.close();
log('ALL DONE');
