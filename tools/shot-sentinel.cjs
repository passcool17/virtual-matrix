// Captures de la sentinelle → ../shots/sentinelle/. node tools/shot-sentinel.cjs
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const OUT = '../shots/sentinelle';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const mobile of [false, true]) {
    const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const tag = mobile ? 'mobile' : 'desktop', shot = n => p.screenshot({ path: `${OUT}/${n}-${tag}.png` });
    await p.goto('http://localhost:8642/?qa=1&seed=3'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
    // vue de côté : hors du cône (pas de détection)
    const side = (dist, up) => p.evaluate(([dist, up]) => { const s = __vm.sentries()[0], G = __vm.G; const sx = -s.dir.z, sz = s.dir.x, n = Math.hypot(sx, sz);
      G.pos.set(s.pos.x + sx / n * dist + s.dir.x * 1.5, s.pos.y + up, s.pos.z + sz / n * dist + s.dir.z * 1.5); const vx = s.pos.x - G.pos.x, vz = s.pos.z - G.pos.z; G.yaw = Math.atan2(-vx, -vz); G.pitch = Math.atan2(s.pos.y - G.pos.y, Math.hypot(vx, vz)); G.vel.set(0, 0, 0); }, [dist, up]);
    await p.evaluate(() => __vm.waitT(1)); await side(7, 1.5); await p.evaluate(() => __vm.waitT(0.15)); await side(7, 1.5); await shot('gros-plan');
    await side(24, 6); await p.evaluate(() => __vm.waitT(0.15)); await side(24, 6); await shot('patrouille');
    await p.evaluate(() => __vm.waitT(10)); // après la période de grâce
    await p.evaluate(() => __vm.tpSentry(0, 9)); await p.evaluate(() => __vm.waitT(1.0)); await p.evaluate(() => __vm.tpSentry(0, 9)); await shot('detection');
    console.log(tag, 'fps', await p.evaluate(() => __vm.fps().toFixed(1)), 'render', JSON.stringify(await p.evaluate(() => __vm.renderInfo())), 'errs', errs.length, errs.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close();
})();
