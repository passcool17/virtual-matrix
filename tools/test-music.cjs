// Musique : démarre après le 1er geste, bascule quand l'alerte monte, rotation, sourdine, 0 erreur.
// node tools/test-music.cjs [desktop|mobile|all]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const URL = 'http://localhost:8642/?seed=3', mode = process.argv[2] || 'all', results = [];
const ok = (n, pass, info = '') => { results.push({ n, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}${info ? '  ' + info : ''}`); };
async function run(kind) {
  const mobile = kind === 'mobile', px = mobile ? 'm' : 'd';
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const req = []; p.on('request', r => { if (r.url().endsWith('.mp3')) req.push(r.url().split('/').pop()); });
  const M = () => p.evaluate(() => __vm.music());
  const until = (fn, arg, t = 60000) => p.waitForFunction(fn, arg, { timeout: t, polling: 250 }).then(() => true, () => false);
  await p.goto(URL); await p.waitForFunction(() => window.__vm, null, { timeout: 120000 }); await p.waitForTimeout(2000);
  let s = await M(); ok(`${px} silence avant le 1er geste`, !s.unlocked && !s.playing && !s.src && req.length === 0, JSON.stringify({ playing: s.playing, src: s.src, req }));
  if (mobile) await p.tap('#bRed'); else await p.click('#bRed');
  const started = await until(() => { const s = __vm.music(); return s.playing && s.time > 0.3 && /theme/.test(s.src); });
  s = await M(); ok(`${px} thème démarre après le clic du menu`, started, `${s.src} t=${s.time.toFixed(2)} vol=${s.vol.toFixed(2)}`);
  ok(`${px} une seule piste chargée au départ (streaming)`, new Set(req).size === 1, req.join(','));
  // Alerte niveau 2 → escape (fondu)
  await p.evaluate(() => __vm.setAlert(5));
  const esc = await until(() => { const s = __vm.music(); return s.mood === 'escape' && /escape/.test(s.src) && s.playing && s.time > 0.2; });
  s = await M(); ok(`${px} alerte niv. 2 → escape`, esc, `${s.src} lvl=${await p.evaluate(() => __vm.G.alertLvl)} autre=${JSON.stringify(s.other)}`);
  const xf = await until(() => { const s = __vm.music(); return !s.other.playing && s.vol > 0.5; }, null, 30000);
  s = await M(); ok(`${px} fondu enchaîné terminé (thème coupé, escape plein volume)`, xf, `vol=${s.vol.toFixed(2)} autre=${JSON.stringify(s.other)}`);
  // Retour au calme (hystérésis 4 s) → thème suivant
  await p.evaluate(() => __vm.setAlert(0));
  const back = await until(() => { const s = __vm.music(); return s.mood === 'theme' && s.playing; }, null, 30000);
  s = await M(); ok(`${px} retour au calme → thème suivant (rotation)`, back && s.src === 'theme-2.mp3', s.src);
  // Fin de piste → piste suivante de la liste
  const before = (await M()).src; await p.evaluate(() => __vm.musicSeekEnd());
  const nxt = await until(b => { const s = __vm.music(); return s.playing && s.src !== b; }, before, 30000);
  s = await M(); ok(`${px} fin de piste → suivante de la liste`, nxt && s.src === 'theme-1.mp3', `${before} → ${s.src}`);
  // Sourdine M / bouton Son
  if (mobile) await p.tap('#bMute'); else await p.keyboard.press('KeyM');
  s = await M(); ok(`${px} sourdine coupe la musique`, s.muted && (await p.evaluate(() => __vm.G.muted)), JSON.stringify({ muted: s.muted }));
  if (mobile) await p.tap('#bMute'); else await p.keyboard.press('KeyM');
  s = await M(); ok(`${px} son réactivé`, !s.muted);
  // SOURCE → escape
  await p.evaluate(() => { for (const id of ['spoon', 'rabbit', 'desert', 'choice', 'sleep']) __vm.solve(id); __vm.setAlert(0); __vm.open('source'); });
  const src = await until(() => { const s = __vm.music(); return s.mood === 'escape' && /escape/.test(s.src) && s.playing; });
  s = await M(); ok(`${px} verrou SOURCE → escape`, src, `${s.src} lock=${await p.evaluate(() => __vm.G.lockId)}`);
  ok(`${px} rotation escape (escape-2 après escape-1)`, s.src === 'escape-2.mp3', s.src);
  ok(`${px} aucune erreur audio`, !s.err);
  ok(`${px} 0 erreur JS`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
}
(async () => {
  for (const k of mode === 'all' ? ['desktop', 'mobile'] : [mode]) { try { await run(k); } catch (e) { ok(`${k} exécution`, false, e.message.split('\n')[0]); } }
  const f = results.filter(r => !r.pass); console.log(`\n${results.length - f.length}/${results.length} PASS`); process.exit(f.length ? 1 : 0);
})();
