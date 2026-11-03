// Sonde : partie entière via __vm.solve sur bureau, affiche l'état après chaque étape.
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8642/?qa=1&seed=7'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
  const st = () => p.evaluate(() => `phase=${__vm.G.phase} t=${__vm.G.t.toFixed(2)} lock=${__vm.G.lockId} ptr=${!!document.pointerLockElement} opened=${[...__vm.G.opened]}`);
  for (const id of ['spoon', 'rabbit', 'desert', 'choice', 'sleep', 'source']) {
    const r = await p.evaluate(id => __vm.solve(id), id); console.log(id, r, await st());
    await p.waitForTimeout(1500); console.log('  +1.5s', await st());
  }
  await b.close();
})();
