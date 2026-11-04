// Sentinelles : détection → pare-feu +1, recharge, pause pendant un verrou, zone sûre, renfort niveau 2. node tools/test-sentinel.cjs [mobile]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const mobile = process.argv.includes('mobile');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('http://localhost:8642/?qa=1&seed=3'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
  ok(await ev(() => __vm.sentries().length === 2 && __vm.sentries()[0].active && !__vm.sentries()[1].active), 'une sentinelle active, la 2e en attente');
  // période de grâce : pas de détection
  await ev(() => __vm.tpSentry(0, 9)); await ev(() => __vm.waitT(1));
  ok(await ev(() => __vm.sentries()[0].detect === 0), 'grâce de début de run : aucune détection');
  await ev(() => __vm.tpClue ? 0 : 0); await ev(() => { __vm.G.pos.set(0, 40, 30); }); await ev(() => __vm.waitT(10));
  // détection progressive puis alerte
  await ev(() => __vm.tpSentry(0, 9)); await ev(() => __vm.waitT(0.7)); await ev(() => __vm.tpSentry(0, 9));
  const mid = await ev(() => ({ d: __vm.sentries()[0].detect, a: __vm.G.alert, hud: document.getElementById('hSent').classList.contains('on') }));
  ok(mid.d > 0.2 && mid.d < 1 && mid.a === 0 && mid.hud, `détection en cours (${mid.d.toFixed(2)}) + HUD « SENTINELLE · détection », pare-feu inchangé`);
  for (let i = 0; i < 6; i++) { await ev(() => __vm.tpSentry(0, 9)); await ev(() => __vm.waitT(0.25)); }
  const hit = await ev(() => ({ a: __vm.G.alert, st: __vm.sentries()[0].state, c: __vm.sentries()[0].cool, n: __vm.sentries()[0].alerts }));
  ok(hit.a > 0.8 && hit.a < 1.2 && hit.n === 1, `après ~1,5 s dans le cône : pare-feu +1 (alerte ${hit.a.toFixed(2)})`);
  ok(hit.st === 'chase' && hit.c > 8, `poursuite brève + recharge (${hit.st}, ${hit.c.toFixed(1)} s)`);
  // recharge : rester dans le cône ne redéclenche pas
  for (let i = 0; i < 12; i++) { await ev(() => __vm.tpSentry(0, 9)); await ev(() => __vm.waitT(0.25)); }
  ok(await ev(() => __vm.sentries()[0].alerts === 1), 'recharge : pas de 2e alerte pendant 10 s');
  // perte de piste à distance
  await ev(() => __vm.G.pos.set(0, 40, 30)); await ev(() => __vm.waitT(6));
  ok(await ev(() => __vm.sentries()[0].state !== 'chase'), 'piste perdue → retour en patrouille');
  // verrou ouvert : tout est figé
  await ev(() => __vm.waitT(5)); // fin de recharge
  await ev(() => __vm.tpSentry(0, 9)); await ev(() => __vm.open('spoon'));
  const f0 = await ev(() => ({ x: __vm.sentries()[0].pos.x, z: __vm.sentries()[0].pos.z, d: __vm.sentries()[0].detect, a: __vm.G.alert }));
  await ev(() => __vm.waitT(3));
  const f1 = await ev(() => ({ x: __vm.sentries()[0].pos.x, z: __vm.sentries()[0].pos.z, d: __vm.sentries()[0].detect, a: __vm.G.alert, hud: document.getElementById('hSent').classList.contains('on') }));
  ok(f0.x === f1.x && f0.z === f1.z && f1.d === f0.d && f1.a <= f0.a && !f1.hud, 'verrou ouvert : sentinelle et détection en pause');
  await ev(() => __vm.close()); await ev(() => __vm.waitT(0.3));
  // zone sûre autour d'un nœud
  await ev(() => { const s = __vm.sentries()[0]; s.detect = 0; s.cool = 0; s.pos.set(-16, 9, -15); s.dir.set(0, 0, 1); s.state = 'patrol'; __vm.G.pos.set(-16, 6.5, -10); });
  for (let i = 0; i < 8; i++) { await ev(() => { const s = __vm.sentries()[0]; s.pos.set(-16, 9, -15); s.dir.set(0, 0, 1); __vm.G.pos.set(-16, 6.5, -10); }); await ev(() => __vm.waitT(0.25)); }
  ok(await ev(() => __vm.sentries()[0].detect === 0 && __vm.inCone(0)), 'près d\'un nœud (zone sûre) : jamais détecté même dans le cône');
  // renfort au niveau 2
  await ev(() => __vm.setAlert(4.6)); await ev(() => __vm.waitT(0.3));
  ok(await ev(() => __vm.sentries()[1].active), 'pare-feu ≥ 2 : 2e sentinelle en patrouille');
  const fps = await ev(() => __vm.fps()), ri = await ev(() => __vm.renderInfo());
  console.log(`fps ${fps.toFixed(1)} · draw calls ${ri.calls} · triangles ${ri.tris}`);
  ok(errs.length === 0, `0 erreur JS ${errs.slice(0, 3).join(' | ')}`);
  await b.close(); console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT OK'); process.exit(fails ? 1 : 0);
})();
