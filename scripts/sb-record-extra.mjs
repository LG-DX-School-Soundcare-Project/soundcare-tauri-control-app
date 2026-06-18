// 추가 데모 영상: 3D 기기 문열기 / 허브 / 반응기록 / 민감가전설정 / 설정. WebM→MP4.
import puppeteer from 'puppeteer';
import ffmpegPath from 'ffmpeg-static';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

process.env.PATH = path.dirname(ffmpegPath) + path.delimiter + process.env.PATH;

const URL = 'http://127.0.0.1:5300/';
const BASE = 'C:/Users/choho/Documents/storyboard_shots/videos';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[rec+]', ...a);

const PROFILES = [
  { key: 'app', dir: `${BASE}/app`, vp: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { key: 'web', dir: `${BASE}/web`, vp: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false } }
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });

async function prep(vp) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => {
    const kill = () => { try { document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove()); } catch (_) {} };
    const start = () => { kill(); try { new MutationObserver(kill).observe(document.documentElement, { childList: true }); } catch (_) {} };
    if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
    setInterval(kill, 250);
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  for (let i = 0; i < 45; i++) { if (!(await page.$('#app-splash'))) break; await sleep(700); }
  await page.evaluate(() => { location.hash = '#/home'; });
  await sleep(2500);
  return page;
}
const goto = async (page, hash, wait = 2500) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(wait); };
const clickText = (page, t) => page.evaluate((tt) => { const b = [...document.querySelectorAll('a,button')].find((x) => x.textContent.trim() === tt); b?.click(); }, t);
const scrollBottom = async (page, w = 1600) => { await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })); await sleep(w); };
const scrollTo = async (page, top, w = 1200) => { await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'smooth' }), top); await sleep(w); };
async function tapModel(page, dx = 0, dy = 0) {
  const box = await page.$eval('#device-detail-model-viewer canvas', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).catch(() => null);
  if (!box) return;
  await page.mouse.click(box.x + box.w / 2 + dx, box.y + box.h / 2 + dy);
}

async function featDoors(page) {
  await goto(page, '#/devices/rdev-fridge', 5500); // 회전 중
  await tapModel(page, 0, -30); await sleep(2600);  // 문 열기
  await tapModel(page, 0, -30); await sleep(1800);  // 문 닫기
  await goto(page, '#/devices/rdev-dish', 5000);
  await tapModel(page, 0, 0); await sleep(2800);     // 식기세척기 열기
  await tapModel(page, 0, 0); await sleep(1600);
}
async function featHub(page) {
  await goto(page, '#/devices/rdev-hub', 12000); // soundcare.glb(대용량) 로드 + 회전
  await sleep(4000);
}
async function featReactionHistory(page) {
  await goto(page, '#/reports/reaction-history', 3000);
  await scrollTo(page, 400, 1600);
  await scrollBottom(page, 2200);
  await scrollTo(page, 0, 1200);
}
async function featSensitive(page) {
  await goto(page, '#/sensitive-appliances', 3000);
  await scrollTo(page, 350, 1600);
  // 스위치 하나 토글
  await page.evaluate(() => document.querySelector('[role=switch],button[aria-checked]')?.click());
  await sleep(1800);
  await scrollBottom(page, 1800);
}
async function featSettings(page) {
  await goto(page, '#/settings', 3000);
  await scrollTo(page, 350, 1500);
  await scrollTo(page, 0, 800);
  await clickText(page, '프로필'); await sleep(2500);
  await clickText(page, '시스템 상태'); await sleep(2800);
}

const CLIPS = [
  ['08_기기-문열기', featDoors],
  ['09_허브-soundcare', featHub],
  ['10_반응기록', featReactionHistory],
  ['11_민감가전설정', featSensitive],
  ['12_설정', featSettings]
];

for (const prof of PROFILES) {
  for (const [name, fn] of CLIPS) {
    const page = await prep(prof.vp);
    const out = `${prof.dir}/${name}.webm`;
    const rec = await page.screencast({ path: out });
    try { await fn(page, prof); } catch (e) { log('action err', prof.key, name, e.message); }
    await rec.stop();
    await page.close();
    log(prof.key, name, `${fs.statSync(out).size} bytes`);
  }
}
await browser.close();
log('recording done — mp4...');
for (const prof of PROFILES) {
  for (const [name] of CLIPS) {
    const webm = `${prof.dir}/${name}.webm`;
    const mp4 = `${prof.dir}/${name}.mp4`;
    if (!fs.existsSync(webm)) continue;
    try {
      execFileSync(ffmpegPath, ['-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', mp4], { stdio: 'ignore' });
      fs.unlinkSync(webm);
      log('mp4', prof.key, name, `${fs.statSync(mp4).size} bytes`);
    } catch (e) { log('convert failed', prof.key, name, e.message); }
  }
}
log('ALL DONE');
