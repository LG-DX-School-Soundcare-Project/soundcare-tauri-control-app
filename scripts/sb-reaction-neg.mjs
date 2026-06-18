// 홈에서 "불편해요(부정)" 반응 버튼을 누른 직후(기록됨) 화면 캡쳐. 모바일+웹.
import puppeteer from 'puppeteer';
const URL = 'http://127.0.0.1:5300/';
const B = 'C:/Users/choho/Documents/storyboard_shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });

async function capture(profile, vp, folders) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  for (let i=0;i<45;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }
  await page.evaluate(() => { location.hash = '#/home'; });
  await sleep(3500);
  // 불편해요(부정) 버튼 클릭
  await page.evaluate(() => document.querySelector('[data-reaction="NEGATIVE"]')?.click());
  await sleep(900); // "기록됨 (3건)" 표시 구간
  await page.evaluate(() => document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove()));
  for (const f of folders) await page.screenshot({ path: `${f}/home-reaction-negative.png` });
  console.log(`[${profile}] saved home-reaction-negative ->`, folders.map((x)=>x.split('/').pop()).join(','));
  await page.close();
}

await capture('mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, [`${B}/drama`, `${B}/ad`]);
await capture('web', { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false }, [`${B}/drama_web`, `${B}/ad_web`]);

await browser.close();
console.log('DONE');
