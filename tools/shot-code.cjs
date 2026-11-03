// Capture du verrou CUILLÈRE (code à 4 chiffres) après deux essais ratés. node tools/shot-code.cjs <préfixe>
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const pre = process.argv[2] || 'code';
(async () => {
  require('fs').mkdirSync('../shots/ordre-code', { recursive: true });
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const mobile of [false, true]) {
    const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8642/?qa=1&seed=3'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
    await p.evaluate(() => { __vm.tpClue('spoon'); }); await p.evaluate(() => __vm.waitT(0.3));
    await p.evaluate(() => __vm.open('spoon'));
    const s = (await p.evaluate(() => __vm.secret('spoon'))).split('');
    const x = ['1', '2', '3', '4', '5', '6'].find(d => !s.includes(d));
    for (const g of [[s[1], s[2], s[3], s[0]], [s[0], s[2], s[1], x]]) for (const d of [...g, 'ok']) await p.click(`#lkBody [data-act="${d}"]`);
    await p.evaluate(() => __vm.waitT(0.3)); await p.evaluate(() => document.querySelectorAll('#denied .deny').forEach(e => e.style.display = 'none'));
    await p.screenshot({ path: `../shots/ordre-code/${pre}-${mobile ? 'mobile' : 'desktop'}.png` });
    console.log(pre, mobile ? 'mobile' : 'desktop', 'secret', s.join(''), 'alert', await p.evaluate(() => __vm.G.alert.toFixed(2)), 'errs', errs.length);
    await p.close();
  }
  await b.close();
})();
