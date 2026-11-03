// Consignes vocales : chaque verrou joue son fichier à l'ouverture, la musique baisse, la fermeture coupe la voix.
// node tools/test-voice.cjs [desktop|mobile|all]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const URL = 'http://localhost:8642/?seed=3', mode = process.argv[2] || 'all', results = [];
const ok = (n, pass, info = '') => { results.push({ n, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}${info ? '  ' + info : ''}`); };
const FILES = { spoon: '01_cuillere', rabbit: '02_lapin', desert: '03_desert', choice: '04_choix', sleep: '05_sommeil', source: '06_source' };
async function run(kind) {
  const mobile = kind === 'mobile', px = mobile ? 'm' : 'd';
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] });
  const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const V = () => p.evaluate(() => ({ v: __vm.voice(), m: __vm.music() }));
  const until = (fn, arg, t = 30000) => p.waitForFunction(fn, arg, { timeout: t, polling: 200 }).then(() => true, () => false);
  await p.goto(URL); await p.waitForFunction(() => window.__vm, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  if (mobile) await p.tap('#bRed'); else await p.click('#bRed');
  await until(() => { const m = __vm.music(); return m.playing && m.vol > 0.5; }, null, 60000);
  // Fichier manquant → aucune erreur, musique remontée (avant que le fichier soit en cache)
  await p.route('**/voice/*01_cuillere*', r => r.abort());
  await p.evaluate(() => __vm.open('spoon'));
  const fail = await until(() => !__vm.voice().playing && __vm.voice().id === null && __vm.music().duck > 0.95, null, 15000);
  let f0 = await V(); ok(`${px} fichier introuvable : pas de blocage, musique remontée`, fail, JSON.stringify(f0.v));
  await p.evaluate(() => __vm.close()); await p.unroute('**/voice/*01_cuillere*');
  const ids = Object.keys(FILES);
  for (const id of ids) {
    if (id === 'source') await p.evaluate(() => { for (const i of ['spoon', 'rabbit', 'desert', 'choice', 'sleep']) if (!__vm.G.opened.has(i)) __vm.solve(i); });
    await p.evaluate(i => { __vm.setAlert(0); __vm.open(i); }, id);
    const play = await until(f => { const v = __vm.voice(); return v.playing && v.time > 0.2 && v.src === `machine_puzzle_${f}.mp3`; }, FILES[id]);
    let s = await V(); ok(`${px} ${id} : bon fichier joue`, play, `${s.v.src} t=${s.v.time.toFixed(2)}`);
    const duck = await until(() => { const m = __vm.music(); return m.duck < 0.4 && m.vol < 0.55 * 0.4 + 0.01; });
    s = await V(); ok(`${px} ${id} : musique baissée`, duck, `vol=${s.m.vol.toFixed(3)} duck=${s.m.duck.toFixed(2)}`);
    ok(`${px} ${id} : indicateur voix actif`, await p.evaluate(() => document.getElementById('lkVoice').classList.contains('on')));
    if (id === 'sleep') await p.screenshot({ path: `../shots/voix/${px}-lock-voix.png` });
    if (mobile) await p.tap('#lkClose'); else await p.click('#lkClose');
    s = await V(); ok(`${px} ${id} : fermer coupe la voix`, !s.v.playing && s.v.id === null, JSON.stringify({ playing: s.v.playing, id: s.v.id }));
    const up = await until(() => __vm.music().duck > 0.95);
    s = await V(); ok(`${px} ${id} : musique remontée`, up, `duck=${s.m.duck.toFixed(2)}`);
  }
  // Réouverture : rejoue ; bouton voix : rejoue ; fin naturelle → remontée.
  await p.evaluate(() => { __vm.setAlert(0); __vm.open('source'); });
  ok(`${px} réouverture rejoue la consigne`, await until(() => __vm.voice().playing && __vm.voice().src.includes('06_source')));
  const end = await until(() => !__vm.voice().playing && __vm.voice().id === null && __vm.music().duck > 0.95, null, 20000);
  ok(`${px} fin de la consigne → musique remontée`, end);
  if (mobile) await p.tap('#lkVoice'); else await p.click('#lkVoice');
  ok(`${px} bouton voix rejoue`, await until(() => __vm.voice().playing && __vm.voice().time > 0.1));
  // Sourdine : M pendant la voix (bureau) ; bouton ♪ du HUD puis ouverture d'un verrou (tous)
  let s;
  if (!mobile) {
    await p.keyboard.press('KeyM');
    const cut = await until(() => __vm.G.muted && !__vm.voice().playing && __vm.music().muted, null, 10000);
    ok(`${px} M pendant la voix coupe la voix et la musique`, cut);
    await p.keyboard.press('KeyM'); await until(() => !__vm.G.muted, null, 10000);
  }
  await p.evaluate(() => __vm.close());
  if (mobile) await p.tap('#bMute'); else await p.keyboard.press('KeyM');
  await until(() => __vm.G.muted, null, 10000);
  await p.evaluate(() => __vm.open('source')); await p.waitForTimeout(800);
  s = await V(); ok(`${px} en sourdine : aucune voix à l'ouverture`, !s.v.playing && s.m.muted, JSON.stringify(s.v));
  await p.evaluate(() => __vm.close());
  if (mobile) await p.tap('#bMute'); else await p.keyboard.press('KeyM');
  const real = errors.filter(e => !/Failed to load resource|ERR_FAILED/.test(e));
  ok(`${px} 0 erreur JS`, real.length === 0, errors.slice(0, 3).join(' | '));
  await b.close();
}
(async () => {
  require('fs').mkdirSync('../shots/voix', { recursive: true });
  for (const k of mode === 'all' ? ['desktop', 'mobile'] : [mode]) { try { await run(k); } catch (e) { ok(`${k} exécution`, false, e.message.split('\n')[0]); } }
  const f = results.filter(r => !r.pass); console.log(`\n${results.length - f.length}/${results.length} PASS`); process.exit(f.length ? 1 : 0);
})();
