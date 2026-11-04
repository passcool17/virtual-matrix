// Captures de l'IA des sentinelles → ../shots/sentinelle-ia/ (soupçon, traque, recherche, capturé, signature). node tools/shot-sentinel-ia.cjs
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const OUT = '../shots/sentinelle-ia';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const mobile of [false, true]) {
    const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
    const tag = mobile ? 'mobile' : 'desktop', shot = n => p.screenshot({ path: `${OUT}/${n}-${tag}.png` }), ev = (f, a) => p.evaluate(f, a);
    await p.goto('http://localhost:8642/?qa=1&seed=3'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
    await ev(() => { const V = __vm, G = V.G; const X = 30, Y = 16, Z = -30;
      window.__hold = (s, f) => new Promise(r => { const end = G.t + s; const k = () => { f(G.t); if (G.t >= end) r(); else requestAnimationFrame(k); }; k(); });
      window.__face = (d, yawS = 0.7) => { const s = V.sentries()[0]; s.pos.set(X, Y, Z); s.yaw = yawS; s.speed = 0; V.tpSentry(0, d); const h = Math.hypot(s.pos.x - G.pos.x, s.pos.z - G.pos.z); G.pitch = Math.atan2(s.pos.y - G.pos.y, h); };
      window.__side = (d, up) => { const s = V.sentries()[0], fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); G.pos.set(s.pos.x - fz * d + fx * 4, s.pos.y + up, s.pos.z + fx * d + fz * 4); G.prevPos = null; const vx = s.pos.x - G.pos.x, vz = s.pos.z - G.pos.z; G.yaw = Math.atan2(-vx, -vz); G.pitch = Math.atan2(s.pos.y - G.pos.y, Math.hypot(vx, vz)); }; });
    await ev(() => __vm.waitT(4.5));
    await ev(() => __hold(0.35, () => __face(15))); await shot('soupcon');
    await ev(() => __hold(1.4, () => __face(13))); await ev(() => __hold(0.4, () => { const s = __vm.sentries()[0]; __side(9, 2); })); await shot('traque');
    await ev(() => { const s = __vm.sentries()[0]; s.state = 'search'; s.stateT = 0; s.last.copy(s.pos); s.aware = 0.5; }); await ev(() => __hold(1.5, () => __side(12, 3))); await shot('recherche');
    await ev(() => { const s = __vm.sentries()[0]; s.state = 'hunt'; s.aware = 1; s.cool = 5; }); await ev(() => __hold(0.35, () => { __face(0.6); __vm.sentries()[0].state = 'hunt'; })); await shot('contact');
    await ev(() => __hold(0.4, () => { if (!__vm.G.sentCatches) { __face(0.6); __vm.sentries()[0].state = 'hunt'; } })); await ev(() => { const s = __vm.sentries()[0], G = __vm.G, vx = s.pos.x - G.pos.x, vz = s.pos.z - G.pos.z; G.yaw = Math.atan2(-vx, -vz); }); await ev(() => __vm.waitT(0.25)); await shot('capture');
    await ev(() => { const s = __vm.sentries()[0]; s.state = 'patrol'; s.aware = 0; s.stateT = 0; s.cool = 8; s.catchT = 0; }); await ev(() => __vm.waitT(3.5)); await ev(() => { const s = __vm.sentries()[0]; s.state = 'patrol'; s.aware = 0; });
    await ev(() => { const G = __vm.G, s = __vm.sentries()[0]; let a = 0, last = G.t; G.prevPos = null; return __hold(1.2, t => { a += (t - last) * 2.6; last = t; s.pos.set(30, 16, -30); s.yaw = 0.7 + Math.PI; G.pos.set(30 + Math.sin(a) * 11, 17, -30 + 4 + Math.abs(Math.cos(a)) * 7); const vx = s.pos.x - G.pos.x, vz = s.pos.z - G.pos.z; G.yaw = Math.atan2(-vx, -vz); G.pitch = 0; }); }); await shot('signature');
    console.log(tag, 'fps', await ev(() => __vm.fps().toFixed(1)), 'render', JSON.stringify(await ev(() => __vm.renderInfo())), 'catches', await ev(() => __vm.G.sentCatches), 'errs', errs.length, errs.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close();
})();
