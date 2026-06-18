import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://127.0.0.1:5300/', { waitUntil: 'networkidle2', timeout: 60000 });
for (let i=0;i<45;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }
await page.evaluate(() => { location.hash = '#/home'; });
await sleep(3000);
const info = await page.evaluate(() => {
  const out = [];
  for (const el of document.body.children) {
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName, id: el.id, cls: (el.className && el.className.toString && el.className.toString()) || '',
      pos: cs.position, z: cs.zIndex, hasShadow: !!el.shadowRoot,
      br: cs.bottom + '/' + cs.right
    });
  }
  // search anything mentioning adguard
  const adg = [...document.querySelectorAll('*')].filter((e) => /adguard|assistant/i.test(e.id||'') || /adguard|assistant/i.test((e.className&&e.className.toString&&e.className.toString())||'')).map((e)=>({tag:e.tagName,id:e.id,cls:(e.className&&e.className.toString&&e.className.toString())||''}));
  return { bodyChildren: out, adg, htmlChildren: [...document.documentElement.children].map(e=>e.tagName+'#'+e.id) };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
