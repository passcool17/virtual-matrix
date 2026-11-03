// Musique : une piste par étape (menu escape-1 → calme theme-1 → alerte escape-2 → SOURCE theme-2), 1er geste, fondu, boucle, sourdine, 0 erreur.
// node tools/test-music.cjs [desktop|mobile|all]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const URL = 'http://localhost:8642/?seed=3', mode = process.argv[2] || 'all', results = [];
const ok = (n, pass, info = '') => { results.push({ n, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}${info ? '  ' + info : ''}`); };
async function run(kind) {
  const mobile = kind === 'mobile', px = mobile ? 'm' : 'd';
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const req = [], order = []; p.on('request', r => { if (/\/music\/.*\.mp3$/.test(r.url())) { const f = r.url().split('/').pop(); req.push(f); if (!order.includes(f)) order.push(f); } });
  const M = () => p.evaluate(() => __vm.music());
  const until = (fn, arg, t = 60000) => p.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true, () => false);
  await p.goto(URL); await p.waitForFunction(() => window.__vm, null, { timeout: 120000 }); await p.waitForTimeout(2000);
  let s = await M(); ok(`${px} silence avant le 1er geste`, !s.unlocked && !s.playing && !s.src && req.length === 0, JSON.stringify({ playing: s.playing, src: s.src, req }));
  const track = (f, t = 60000) => until(f => { const s = __vm.music(); return s.playing && s.time > 0.2 && s.src === f; }, f, t);
  // 1 · menu → escape-1 (1:53) : un geste sur le menu, sans lancer la partie
  await p.mouse.click(5, 5);
  s = await M(); const m1 = await track('escape-1.mp3'); s = await M();
  ok(`${px} 1 · menu → escape-1 après le 1er geste`, m1 && (await p.evaluate(() => __vm.G.phase)) === 'menu', `${s.src} t=${s.time.toFixed(2)} mood=${s.mood}`);
  ok(`${px} une seule piste chargée au départ (streaming)`, new Set(req).size === 1, req.join(','));
  // 2 · vol calme → theme-1 (2:05)
  if (mobile) await p.tap('#bRed'); else await p.click('#bRed');
  const m2 = await track('theme-1.mp3'); s = await M(); ok(`${px} 2 · vol calme → theme-1`, m2 && s.mood === 'calm', `${s.src} mood=${s.mood}`);
  const xf = await until(() => { const s = __vm.music(); return !s.other.playing && s.vol > 0.5; }, null, 30000);
  s = await M(); ok(`${px} fondu enchaîné terminé (escape-1 coupé, theme-1 plein volume)`, xf, `vol=${s.vol.toFixed(2)} autre=${JSON.stringify(s.other)}`);
  // 3 · pare-feu niv. 2 → escape-2 (2:13)
  await p.evaluate(() => __vm.setAlert(5));
  const m3 = await track('escape-2.mp3'); s = await M(); ok(`${px} 3 · pare-feu niv. 2 → escape-2`, m3 && s.mood === 'alert', `${s.src} lvl=${await p.evaluate(() => __vm.G.alertLvl)}`);
  // Retour au calme (hystérésis 4 s) → theme-1
  await p.evaluate(() => __vm.setAlert(0));
  const back = await track('theme-1.mp3', 30000); s = await M(); ok(`${px} retour au calme → theme-1`, back, s.src);
  // Fin de piste → la même piste reboucle en fondu
  await until(() => !__vm.music().other.playing, null, 30000);
  const before = await p.evaluate(() => __vm.music().time); await p.evaluate(() => __vm.musicSeekEnd());
  const loop = await until(() => { const s = __vm.music(); return s.playing && s.src === 'theme-1.mp3' && s.time < 3; }, null, 30000);
  s = await M(); ok(`${px} fin de piste → theme-1 reboucle`, loop, `t ${before.toFixed(1)} → ${s.time.toFixed(1)}`);
  // Sourdine M / bouton Son
  if (mobile) await p.tap('#bMute'); else await p.keyboard.press('KeyM');
  await until(() => __vm.music().muted, null, 5000);
  s = await M(); ok(`${px} sourdine coupe la musique`, s.muted && (await p.evaluate(() => __vm.G.muted)), JSON.stringify({ muted: s.muted }));
  if (mobile) await p.tap('#bMute'); else await p.keyboard.press('KeyM');
  await until(() => !__vm.music().muted, null, 5000); s = await M(); ok(`${px} son réactivé`, !s.muted);
  // 4 · verrou final SOURCE → theme-2 (2:16), même si le pare-feu est haut
  await p.evaluate(() => { for (const id of ['spoon', 'rabbit', 'desert', 'choice', 'sleep']) __vm.solve(id); __vm.setAlert(5); __vm.open('source'); });
  const m4 = await track('theme-2.mp3'); s = await M(); ok(`${px} 4 · verrou SOURCE → theme-2`, m4 && s.mood === 'source', `${s.src} lock=${await p.evaluate(() => __vm.G.lockId)}`);
  // Voix pendant SOURCE : la musique baisse
  const duck = await until(() => __vm.music().duck < 0.4, null, 10000); ok(`${px} voix SOURCE : musique baissée`, duck);
  // Écran de fin → escape-1 (retour au menu)
  await p.evaluate(() => __vm.solve('source'));
  const end = await track('escape-1.mp3'); s = await M(); ok(`${px} écran de fin → escape-1`, end, `${s.src} phase=${await p.evaluate(() => __vm.G.phase)}`);
  ok(`${px} ordre des pistes 1→4 respecté`, JSON.stringify(order) === JSON.stringify(['escape-1.mp3', 'theme-1.mp3', 'escape-2.mp3', 'theme-2.mp3']), order.join(' → '));
  ok(`${px} aucune erreur audio`, !s.err);
  ok(`${px} 0 erreur JS`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
}
(async () => {
  for (const k of mode === 'all' ? ['desktop', 'mobile'] : [mode]) { try { await run(k); } catch (e) { ok(`${k} exécution`, false, e.message.split('\n')[0]); } }
  const f = results.filter(r => !r.pass); console.log(`\n${results.length - f.length}/${results.length} PASS`); process.exit(f.length ? 1 : 0);
})();
