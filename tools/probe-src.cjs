const { chromium, devices } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8642/?qa=1&seed=7'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
  const box = s => p.evaluate(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && [r.left, r.top, r.width, r.height].map(Math.round).join(','); }, s);
  console.log('HUD', await box('.hud-left'), '|alert', await box('#hAlert'), '|right', await box('.hud-right'));
  for (const id of ['spoon', 'rabbit', 'desert', 'choice', 'sleep']) await p.evaluate(id => __vm.solve(id), id);
  await p.evaluate(() => { __vm.G.trauma = 0; __vm.open('source'); });
  const so = await p.evaluate(() => __vm.secret('source'));
  for (const c of so.order.slice().reverse()) await p.tap(`#lkBody [data-act="${c}"]`, { timeout: 15000 });
  console.log('after wrong: lock', await p.evaluate(() => __vm.G.lockId), 'denied', await p.evaluate(() => __vm.G.denied));
  const sel = `#lkBody [data-act="${so.order[0]}"]`;
  console.log('btn', await box(sel), 'hit', await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e ? (e.id || e.className || e.tagName) + ' ' + (e.textContent || '').slice(0, 30) : null; }, sel));
  try { await p.tap(sel, { timeout: 15000 }); console.log('tap ok'); } catch (e) { console.log('TAP FAIL', e.message.split('\n').slice(0, 12).join('\n')); }
  await p.screenshot({ path: '/tmp/probe-src.png' });
  await b.close();
})();
