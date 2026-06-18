import puppeteer from 'puppeteer';

const URL = 'http://127.0.0.1:5300/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--no-sandbox'
  ]
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

// wait for splash to dismiss
for (let i = 0; i < 40; i++) {
  const has = await page.$('#app-splash');
  if (!has) break;
  await sleep(700);
}
await page.evaluate(() => { window.location.hash = '#/home'; });
await sleep(4000);
await page.screenshot({ path: 'C:/Temp/probe_home.png' });

await page.evaluate(() => { window.location.hash = '#/three-home'; });
await sleep(6000);
const info = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')];
  return {
    hash: location.hash,
    nickname: localStorage.getItem('soundcare.nickname'),
    canvases: canvases.length,
    sizes: canvases.map((c) => `${c.width}x${c.height}`)
  };
});
await page.screenshot({ path: 'C:/Temp/probe_3d.png' });
console.log(JSON.stringify(info));
await browser.close();
console.log('DONE');
