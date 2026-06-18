import puppeteer from 'puppeteer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });

async function test(label, vp, out) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto('http://127.0.0.1:5300/', { waitUntil: 'networkidle2', timeout: 60000 });
  for (let i=0;i<40;i++){ if(!(await page.$('#app-splash'))) break; await sleep(700); }
  await page.evaluate(() => { location.hash = '#/home'; });
  await sleep(3000);
  await page.evaluate(() => document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove()));
  const badge = await page.$eval('[data-noti-badge]', (b) => ({ text: b.textContent, hidden: b.classList.contains('hidden') })).catch(() => null);
  await page.evaluate(() => document.querySelector('[data-noti-toggle]')?.click());
  await sleep(600);
  const items = await page.$$eval('[data-noti-item], .noti-item', (els) => els.map((e) => ({
    cls: e.className,
    title: e.querySelector('strong')?.textContent,
    msg: e.querySelector('p')?.textContent,
    time: e.querySelector('small')?.textContent
  })));
  await page.evaluate(() => document.querySelectorAll('html > div, html > iframe').forEach((e) => e.remove()));
  await page.screenshot({ path: out });
  // mark first read
  await page.evaluate(() => document.querySelector('[data-noti-read]')?.click());
  await sleep(300);
  const badgeAfter = await page.$eval('[data-noti-badge]', (b) => ({ text: b.textContent, hidden: b.classList.contains('hidden') })).catch(() => null);
  console.log(`\n[${label}] badge=`, badge, ' items=', items.length);
  items.forEach((it, i) => console.log(`  ${i+1}.`, it.title, '|', (it.msg||'').slice(0,30), '|', it.time, '|', it.cls.includes('unread')?'unread':'read'));
  console.log(`[${label}] badge after read-1 =`, badgeAfter, '-> saved', out);
  await page.close();
}

await test('mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'C:/Temp/noti_mobile.png');
await test('web', { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false }, 'C:/Temp/noti_web.png');
await browser.close();
console.log('\nDONE');
