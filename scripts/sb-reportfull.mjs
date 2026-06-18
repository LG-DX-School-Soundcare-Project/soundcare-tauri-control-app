// report-full.png 재캡쳐: fixed 하단바가 이미지 중간에 박히는 문제 → 하단바 숨기고 전체 스크롤 캡쳐.
import puppeteer from 'puppeteer';
const URL = 'http://127.0.0.1:5300/';
const DRAMA = 'C:/Users/choho/Documents/storyboard_shots/drama';
const AD = 'C:/Users/choho/Documents/storyboard_shots/ad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
for (let i=0;i<45;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }
await page.evaluate(() => { location.hash = '#/reports'; });
await sleep(3500);
await page.evaluate(() => {
  document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove()); // AdGuard
  document.querySelectorAll('.mobile-bottom-nav').forEach((n) => { n.style.display = 'none'; }); // 고정 하단바 숨김
});
await sleep(400);
for (const f of [DRAMA, AD]) await page.screenshot({ path: `${f}/report-full.png`, fullPage: true });
console.log('saved report-full (no bottom bar) to both folders');
await browser.close();
console.log('DONE');
