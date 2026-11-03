// Captures avant/après des verrous DÉSERT, LAPIN et SOURCE. node tools/shot-locks.cjs <préfixe>
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const pre = process.argv[2] || 'locks';
(async () => {
  require('fs').mkdirSync('../shots/ordre-code', { recursive: true });
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const mobile of [false, true]) {
    const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    const shot = n => p.screenshot({ path: `../shots/ordre-code/${pre}-${n}-${mobile ? 'mobile' : 'desktop'}.png` });
    await p.goto('http://localhost:8642/?qa=1&seed=3'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
    await p.evaluate(() => __vm.open('desert')); await p.evaluate(() => __vm.waitT(0.3)); await shot('desert'); await p.evaluate(() => __vm.close());
    await p.evaluate(() => __vm.open('rabbit')); await p.waitForFunction(() => __vm.secret('rabbit').phase === 'input', null, { timeout: 30000 }); await shot('lapin'); await p.evaluate(() => __vm.close());
    await p.evaluate(() => __vm.open('sleep')); await p.evaluate(() => __vm.waitT(0.3)); { const k = await p.evaluate(() => __vm.secret('sleep').k); await p.keyboard.press('Digit' + k); } await p.evaluate(() => __vm.waitT(0.1)); await shot('sommeil'); await p.evaluate(() => __vm.close());
    await p.evaluate(() => { for (const id of ['spoon', 'rabbit', 'desert', 'choice', 'sleep']) __vm.solve(id); __vm.open('source'); }); await p.evaluate(() => __vm.waitT(4)); await shot('source');
    console.log(pre, mobile ? 'mobile' : 'desktop', 'errs', errs.length);
    await p.close();
  }
  await b.close();
})();
