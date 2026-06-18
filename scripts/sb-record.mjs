// 데모 앱/웹 실행 영상 녹화 (기능별 클립 + 전체 워크스루). WebM 출력.
import puppeteer from 'puppeteer';
import ffmpegPath from 'ffmpeg-static';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

process.env.PATH = path.dirname(ffmpegPath) + path.delimiter + process.env.PATH;

const URL = 'http://127.0.0.1:5300/';
const BASE = 'C:/Users/choho/Documents/storyboard_shots/videos';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[rec]', ...a);

const PROFILES = [
  { key: 'app', dir: `${BASE}/app`, vp: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { key: 'web', dir: `${BASE}/web`, vp: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false } }
];
for (const p of PROFILES) fs.mkdirSync(p.dir, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });

async function prep(vp) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  // AdGuard 어시스턴트(우하단 방패)는 인라인 !important라 CSS로는 안 숨겨진다.
  // 주입 노드(html 직속 div/iframe)를 MutationObserver+interval로 계속 제거한다.
  await page.evaluateOnNewDocument(() => {
    const kill = () => { try { document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove()); } catch (_) {} };
    const start = () => { kill(); try { new MutationObserver(kill).observe(document.documentElement, { childList: true }); } catch (_) {} };
    if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
    setInterval(kill, 250);
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  for (let i = 0; i < 45; i++) { if (!(await page.$('#app-splash'))) break; await sleep(700); }
  await page.evaluate(() => { location.hash = '#/home'; });
  await sleep(3500);
  return page;
}
const goto = async (page, hash, wait = 2500) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(wait); };
const click = (page, sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
const scrollTo = async (page, top, wait = 1200) => { await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'smooth' }), top); await sleep(wait); };
const scrollBottom = async (page, wait = 1600) => { await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })); await sleep(wait); };

async function orbit(page) {
  const box = await page.$eval('#three-home-container canvas', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).catch(() => null);
  if (!box) return;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 0; i < 24; i++) { await page.mouse.move(cx - i * 7, cy + Math.sin(i / 4) * 6); await sleep(35); }
  await page.mouse.up();
}

// ---- 기능별 액션 ----
async function featNotifications(page) {
  await sleep(1000);
  await click(page, '[data-noti-toggle]'); await sleep(2500);
  await click(page, '[data-noti-read]'); await sleep(1300);
  await click(page, '[data-noti-readall]'); await sleep(1600);
}
async function featReactions(page) {
  await sleep(800);
  await click(page, '[data-reaction="POSITIVE"]'); await sleep(2200);
  await click(page, '[data-reaction="NEGATIVE"]'); await sleep(2400);
}
async function feat3D(page) {
  await goto(page, '#/three-home', 7000);
  await orbit(page); await sleep(2500);
  await orbit(page); await sleep(2000);
}
async function featDevices(page) {
  await goto(page, '#/devices', 2800);
  await goto(page, '#/devices/rdev-washer', 5500);
  await click(page, '[data-sensitive-toggle]'); await sleep(2200);
  await goto(page, '#/devices', 2200);
  await goto(page, '#/devices/rdev-robot', 5000);
  await sleep(1500);
}
async function featReport(page) {
  await goto(page, '#/reports', 2800);
  await scrollTo(page, 500, 1500);
  await scrollBottom(page, 2000);
  await scrollTo(page, 0, 1200);
  await click(page, '[data-report-period-trigger]'); await sleep(700);
  await click(page, '[data-report-period-option="최근 3일"]'); await sleep(2000);
}
async function featGpt(page) {
  await goto(page, '#/reports', 2500);
  await scrollBottom(page, 1400);
  await click(page, '#generate-gpt-report'); await sleep(1600);
  await page.evaluate(() => { const cb = document.querySelector('#gpt-consent-checkbox'); if (cb) cb.checked = true; });
  await sleep(800);
  await click(page, '#gpt-consent-agree');
  for (let i = 0; i < 22; i++) { if ((await page.evaluate(() => location.hash)).includes('gpt-detailed')) break; await sleep(1000); }
  await sleep(3000);
  await scrollTo(page, 0, 800);
  await click(page, '[data-view-report]'); await sleep(3500);
}
async function featDeviceAdd(page) {
  await goto(page, '#/devices', 2500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '기기 추가'); b?.click(); });
  await sleep(3000);
}

async function fullWalkthrough(page) {
  // 홈 → 알림 → 반응 → 3D → 기기/민감설정 → 리포트 → GPT
  await sleep(800);
  await click(page, '[data-noti-toggle]'); await sleep(2200); await click(page, '[data-noti-readall]'); await sleep(1000);
  await page.evaluate(() => document.body.click()); await sleep(600);
  await click(page, '[data-reaction="POSITIVE"]'); await sleep(1800);
  await click(page, '[data-reaction="NEGATIVE"]'); await sleep(1800);
  await goto(page, '#/three-home', 6500); await orbit(page); await sleep(2000);
  await goto(page, '#/devices', 2500);
  await goto(page, '#/devices/rdev-washer', 5000); await click(page, '[data-sensitive-toggle]'); await sleep(2000);
  await goto(page, '#/reports', 2500); await scrollBottom(page, 1800);
  await click(page, '#generate-gpt-report'); await sleep(1500);
  await page.evaluate(() => { const cb = document.querySelector('#gpt-consent-checkbox'); if (cb) cb.checked = true; }); await sleep(700);
  await click(page, '#gpt-consent-agree');
  for (let i = 0; i < 22; i++) { if ((await page.evaluate(() => location.hash)).includes('gpt-detailed')) break; await sleep(1000); }
  await sleep(2500); await scrollTo(page, 0, 700); await click(page, '[data-view-report]'); await sleep(3500);
}

const CLIPS = [
  ['01_알림', featNotifications],
  ['02_반응버튼', featReactions],
  ['03_3D뷰', feat3D],
  ['04_기기-민감설정', featDevices],
  ['05_리포트', featReport],
  ['06_GPT리포트', featGpt],
  ['07_기기추가', featDeviceAdd],
  ['00_전체', fullWalkthrough]
];

for (const prof of PROFILES) {
  for (const [name, fn] of CLIPS) {
    const page = await prep(prof.vp);
    const out = `${prof.dir}/${name}.webm`;
    const rec = await page.screencast({ path: out });
    try { await fn(page, prof); } catch (e) { log('action err', prof.key, name, e.message); }
    await rec.stop();
    await page.close();
    log(prof.key, name, '->', `${fs.statSync(out).size} bytes`);
  }
}

await browser.close();
log('recording done — converting to mp4...');

// WebM → MP4 (H.264) 변환: 편집툴 호환 + duration 메타데이터 정상화. 변환 후 webm 삭제.
for (const prof of PROFILES) {
  for (const [name] of CLIPS) {
    const webm = `${prof.dir}/${name}.webm`;
    const mp4 = `${prof.dir}/${name}.mp4`;
    if (!fs.existsSync(webm)) continue;
    try {
      execFileSync(ffmpegPath, ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', mp4], { stdio: 'ignore' });
      fs.unlinkSync(webm);
      log('mp4', prof.key, name, `${fs.statSync(mp4).size} bytes`);
    } catch (e) {
      log('convert failed', prof.key, name, e.message);
    }
  }
}
log('ALL DONE');
