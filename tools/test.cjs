// Vérification Playwright (headless SwiftShader, un navigateur à la fois). node tools/test.cjs [desktop|mobile|all]
// Les attentes sont exprimées en temps de jeu (__vm.waitT), pas en millisecondes.
const PW = process.env.PW || '/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright';
const EXE = process.env.CHROME || '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = process.env.URL || 'http://localhost:8642/';
const SHOTS = process.env.SHOTS || require('path').join(__dirname, '../../shots');
const { chromium } = require(PW);
const mode = process.argv[2] || 'all';
const results = []; let errors = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); };

const OVERLAP = sel => {
  const vw = innerWidth, vh = innerHeight, els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && e.textContent.trim() !== '' || (r.width > 0 && e.tagName === 'BUTTON'); });
  const R = els.map(e => ({ e, r: e.getBoundingClientRect(), n: e.id || e.className || e.tagName }));
  const bad = [];
  for (const a of R) { if (a.r.left < -1 || a.r.top < -1 || a.r.right > vw + 1 || a.r.bottom > vh + 1) bad.push(`out:${a.n}`); }
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); if (w > 1 && h > 1) bad.push(`${a.n} × ${b.n}`); }
  return bad;
};
const HUD_SEL = '.hud-top .hud-box, .hud-btn, #hAlert, #hFrags, #joy, #tUp, #tDown, #tHack, #hPrompt, #hBanner.on, #radar';
const LOCK_SEL = '#lock button, #lock .lk-slot, #lock .lk-win, #lock .lk-pulse, #lock .lk-preview, #lock .lk-cipher, #lock .lk-help, #lock .lk-msg';

async function run(kind) {
  const mobile = kind === 'mobile', px = mobile ? 'm' : 'd';
  const browser = await chromium.launch({ executablePath: EXE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = n => p.screenshot({ path: `${SHOTS}/${px}-${n}.png` });
  const ev = (f, a) => p.evaluate(f, a);
  const waitT = s => ev(s => __vm.waitT(s), s);
  const tapOrClick = sel => (mobile ? p.tap(sel) : p.click(sel));
  const act = a => tapOrClick(`#lkBody [data-act="${a}"]`);
  const opened = () => ev(() => [...__vm.G.opened]);
  const deniedCount = () => ev(() => __vm.G.denied);
  const openNear = async id => { await ev(id => __vm.tp(id), id); await waitT(0.25); if (mobile) await p.tap('#tHack'); else await p.keyboard.press('KeyE'); await p.waitForFunction(id => __vm.G.lockId === id, id, { timeout: 20000 }); };
  const solvedBy = async (id, how) => { await p.waitForFunction(id => __vm.G.opened.has(id), id, { timeout: 30000 }).catch(() => {}); ok(`${px} ${id} résolu (${how})`, (await opened()).includes(id)); };
  const pressPulse = async () => { await p.waitForFunction(() => { const t = __vm.G.t, P = __vm.G.pulse, k = Math.round(t / P); return Math.abs(t - k * P) < 0.07 && k !== window.__lastK && (window.__lastK = k, true); }, null, { timeout: 20000, polling: 'raf' });
    if (mobile) await p.tap('#lkBody [data-act="hit"]'); else await p.keyboard.press('Space'); };

  // --- Menu
  await p.goto(URL + '?seed=4242'); await p.waitForFunction(() => window.__vm && document.fonts.status === 'loaded'); await p.waitForTimeout(900);
  await shot('menu');
  const hints = await ev(() => [...document.querySelectorAll('.howto')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.className));
  ok(`${px} menu: consignes ${mobile ? 'tactiles' : 'clavier'}`, hints.length === 1 && hints[0].includes(mobile ? 'tc' : 'kb'), hints.join());
  await tapOrClick('#bBlue'); await p.waitForTimeout(300); ok(`${px} pilule bleue → MONDE RÉEL`, await ev(() => __vm.G.phase === 'blue')); if (!mobile) await shot('blue');
  await tapOrClick('#bReconsider'); await waitT(0.6);
  ok(`${px} jack in`, await ev(() => __vm.G.phase === 'playing'));
  // vol réel : avancer 1,5 s de jeu
  const z0 = await ev(() => __vm.G.pos.z);
  if (mobile) { const j = await p.locator('#joy').boundingBox(); const cx = j.x + j.width / 2, cy = j.y + j.height / 2;
    await p.dispatchEvent('#joy', 'pointerdown', { pointerId: 7, clientX: cx, clientY: cy, pointerType: 'touch', isPrimary: true }); await p.dispatchEvent('#joy', 'pointermove', { pointerId: 7, clientX: cx, clientY: cy - 60, pointerType: 'touch' }); await waitT(1.5); await p.dispatchEvent('#joy', 'pointerup', { pointerId: 7, pointerType: 'touch' }); }
  else { await p.keyboard.down('KeyW'); await waitT(1.5); await p.keyboard.up('KeyW'); }
  const z1 = await ev(() => __vm.G.pos.z); ok(`${px} vol vers l'avant (${mobile ? 'joystick' : 'W'})`, z1 < z0 - 5, `z ${z0.toFixed(1)} → ${z1.toFixed(1)}`);
  if (!mobile) { await p.keyboard.down('Space'); await waitT(0.6); await p.keyboard.up('Space'); }
  await shot('flight');
  const hudBad = await ev(OVERLAP, HUD_SEL); ok(`${px} HUD sans chevauchement`, hudBad.length === 0, hudBad.join(' | '));
  // SOURCE verrouillée avant les 5 autres
  await openNear('source').catch(() => {}); ok(`${px} SOURCE refuse avant 5 verrous (sans alerte)`, (await ev(() => __vm.G.lockId)) === null && (await deniedCount()) === 0);
  await waitT(0.3);

  // --- CUILLÈRE : 3 essais faux (pile DENIED), puis la bonne réponse
  await ev(() => __vm.tpClue('spoon')); await waitT(0.3); ok(`${px} indice CUILLÈRE capté`, await ev(() => __vm.G.clues.has('spoon')));
  await openNear('spoon'); const sec = await ev(() => __vm.secret('spoon'));
  const wrongs = ['1234', '2345', '3456', '6543', '5432'].filter(w => w !== sec).slice(0, 4);
  for (const w of wrongs) { for (const d of w) { if (mobile) await act(d); else await p.keyboard.press('Digit' + d); } if (mobile) await act('ok'); else await p.keyboard.press('Enter'); }
  await waitT(0.2); const dn = await deniedCount(); ok(`${px} DENIED empilés`, dn === 4 && (await ev(() => document.querySelectorAll('#denied .deny').length)) === 4, `denied=${dn}`);
  ok(`${px} retour Mastermind affiché`, /bien placé/.test(await ev(() => document.querySelector('.lk-log').textContent)));
  await shot('denied-stack');
  await ev(() => document.querySelectorAll('#denied .deny').forEach(e => e.style.display = 'none'));
  await shot('lock-spoon'); const lb = await ev(OVERLAP, LOCK_SEL); ok(`${px} overlay CUILLÈRE sans chevauchement`, lb.length === 0, lb.join(' | '));
  await ev(() => document.querySelectorAll('#denied .deny').forEach(e => e.style.display = ''));
  for (const d of sec) { if (mobile) await act(d); else await p.keyboard.press('Digit' + d); } if (mobile) await act('ok'); else await p.keyboard.press('Enter');
  await solvedBy('spoon', mobile ? 'taps' : 'clavier'); await p.waitForTimeout(250); await shot('granted');
  ok(`${px} GRANTED vide la pile`, (await ev(() => document.querySelectorAll('#denied .deny').length)) === 0);
  await waitT(1);

  // --- LAPIN
  await openNear('rabbit'); let shotDone = false;
  for (let r = 0; r < 3; r++) {
    await p.waitForFunction(r => { const s = __vm.secret('rabbit'); return s.round === r && s.phase === 'show'; }, r, { timeout: 30000 });
    if (!shotDone) { await p.waitForFunction(() => document.querySelector('.pad.lit'), null, { timeout: 20000 }); await shot('lock-rabbit'); const b = await ev(OVERLAP, LOCK_SEL); ok(`${px} overlay LAPIN sans chevauchement`, b.length === 0, b.join(' | ')); shotDone = true; }
    await p.waitForFunction(r => { const s = __vm.secret('rabbit'); return s.round === r && s.phase === 'input'; }, r, { timeout: 30000 });
    const seq = (await ev(() => __vm.secret('rabbit'))).seq;
    for (const i of seq) { if (mobile) await act(String(i)); else await p.keyboard.press('Digit' + (i + 1)); }
  }
  await solvedBy('rabbit', mobile ? 'taps' : 'clavier'); await waitT(0.5);

  // --- DÉSERT (indice SOMMEIL posé à côté)
  await ev(() => __vm.tpClue('sleep')); await waitT(0.3); ok(`${px} indice SOMMEIL capté`, await ev(() => __vm.G.clues.has('sleep')));
  await openNear('desert'); await shot('lock-desert'); { const b = await ev(OVERLAP, LOCK_SEL); ok(`${px} overlay DÉSERT sans chevauchement`, b.length === 0, b.join(' | ')); }
  const ds = await ev(() => __vm.secret('desert'));
  for (let r = 0; r < 3; r++) { for (let k = 0; k < ds.steps[r]; k++) { if (mobile) await act('L' + r); else await p.keyboard.press('ArrowLeft'); } if (!mobile) await p.keyboard.press('ArrowDown'); }
  if (mobile) await act('ok'); else await p.keyboard.press('Enter');
  await solvedBy('desert', mobile ? 'taps' : 'clavier'); await waitT(0.5);

  // --- CHOIX (rythme)
  await openNear('choice'); await pressPulse(); await waitT(0.1); await shot('lock-choice'); { const b = await ev(OVERLAP, LOCK_SEL); ok(`${px} overlay CHOIX sans chevauchement`, b.length === 0, b.join(' | ')); }
  await pressPulse(); await pressPulse();
  await solvedBy('choice', mobile ? 'tap rythmé' : 'Espace rythmé'); await waitT(0.5);

  // --- SOMMEIL
  await openNear('sleep'); const ss = await ev(() => __vm.secret('sleep'));
  for (let k = 0; k < ss.k; k++) { if (mobile) await act('up'); else await p.keyboard.press('ArrowRight'); }
  await shot('lock-sleep'); { const b = await ev(OVERLAP, LOCK_SEL); ok(`${px} overlay SOMMEIL sans chevauchement`, b.length === 0, b.join(' | ')); }
  ok(`${px} SOMMEIL aperçu = mot clair`, (await ev(() => document.querySelector('.lk-preview').textContent)) === ss.word, ss.word);
  if (mobile) await act('ok'); else await p.keyboard.press('Enter');
  await solvedBy('sleep', mobile ? 'taps' : 'clavier'); await waitT(0.5);

  // --- SOURCE
  await openNear('source'); await shot('lock-source'); { const b = await ev(OVERLAP, LOCK_SEL); ok(`${px} overlay SOURCE sans chevauchement`, b.length === 0, b.join(' | ')); }
  const so = await ev(() => __vm.secret('source'));
  // un ordre faux d'abord
  const wrongOrder = so.order.slice().reverse();
  for (const c of wrongOrder) { if (mobile) await act(c); else await p.keyboard.press('Digit' + (so.choices.indexOf(c) + 1)); }
  ok(`${px} SOURCE ordre faux → DENIED`, (await ev(() => __vm.G.lockId)) === 'source' && (await deniedCount()) === 5);
  for (const c of so.order) { if (mobile) await act(c); else await p.keyboard.press('Digit' + (so.choices.indexOf(c) + 1)); }
  await solvedBy('source', mobile ? 'taps' : 'clavier');
  await p.waitForFunction(() => __vm.G.phase === 'complete', null, { timeout: 60000 }).catch(() => {});
  ok(`${px} partie complète → écran de fin`, await ev(() => __vm.G.phase === 'complete'));
  const best = await ev(() => localStorage.getItem('vm-lockdown-best')); ok(`${px} MEILLEUR enregistré`, /"denied":5/.test(best || ''), best);
  await p.waitForTimeout(700); await shot('end');

  // --- Accroches : partie entière via __vm.solve
  await tapOrClick('#bAgain'); await waitT(0.3);
  for (const id of ['spoon', 'rabbit', 'desert', 'choice', 'sleep', 'source']) { const r = await ev(id => __vm.solve(id), id); ok(`${px} ${id} résolu (accroche)`, r); await waitT(0.1); }
  await p.waitForFunction(() => __vm.G.phase === 'complete', null, { timeout: 60000 }).catch(() => {});
  ok(`${px} partie via accroches → fin`, await ev(() => __vm.G.phase === 'complete'));

  // --- Pare-feu niveau 3 + sentinelle
  await tapOrClick('#bAgain'); await waitT(0.3); await ev(() => __vm.solve('spoon')); await ev(() => __vm.solve('rabbit')); await waitT(2);
  await ev(() => { __vm.tp('desert'); __vm.setAlert(7); }); await waitT(0.3);
  ok(`${px} niveau 3 → sentinelle`, await ev(() => __vm.G.alertLvl === 3 && __vm.G.sentinel.on));
  await ev(() => { const G = __vm.G; G.sentinel.pos.set(G.pos.x + 1.5, G.pos.y + 0.6, G.pos.z - 9); }); await waitT(0.15);
  await shot('alert3-sentinel');
  const before = await ev(() => ({ n: __vm.G.opened.size, pos: __vm.G.pos.clone() }));
  await waitT(1.6);
  const after = await ev(() => ({ n: __vm.G.opened.size, on: __vm.G.sentinel.on, alert: __vm.G.alert, rabbit: __vm.G.opened.has('rabbit') }));
  ok(`${px} contact sentinelle : dernier fragment volé, alerte → ~4`, before.n === 2 && after.n === 1 && !after.rabbit && !after.on && after.alert <= 4.01, JSON.stringify(after));
  // décroissance
  const a0 = await ev(() => __vm.G.alert); await waitT(3); const a1 = await ev(() => __vm.G.alert); ok(`${px} alerte décroît`, a1 < a0, `${a0.toFixed(2)} → ${a1.toFixed(2)}`);

  // --- FPS (vol, 6 s réelles)
  await ev(() => __vm.tp('spoon'));
  const fps = await ev(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 6000 ? requestAnimationFrame(f) : r(n * 1000 / (performance.now() - t0)); }; requestAnimationFrame(f); }));
  ok(`${px} FPS mesuré`, fps > 0, `${fps.toFixed(1)} img/s (SwiftShader logiciel)`);
  ok(`${px} 0 erreur JS`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
}

(async () => {
  for (const k of mode === 'all' ? ['desktop', 'mobile'] : [mode]) { try { await run(k); } catch (e) { ok(`${k} exécution`, false, e.message.split('\n')[0]); } }
  const f = results.filter(r => !r.pass); console.log(`\n${results.length - f.length}/${results.length} PASS`); process.exit(f.length ? 1 : 0);
})();
