// IA des sentinelles : états, vue (cône = cône visible), ligne de vue (piliers), signature énergétique, capture, impulsion, coordination.
// node tools/test-sentinel-ia.cjs [mobile]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const mobile = process.argv.includes('mobile');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('http://localhost:8642/?qa=1&seed=3'); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
  // utilitaires dans la page : fige une sentinelle (pos/yaw/tilt) et appelle f à chaque image pendant s secondes de jeu
  await ev(() => {
    const V = __vm, G = V.G;
    window.__hold = (s, f) => new Promise(r => { const end = G.t + s; const k = () => { f(G.t); if (G.t >= end) r(); else requestAnimationFrame(k); }; k(); });
    window.__pin = (i, x, y, z, yaw = 0, tilt = 0.3) => { const s = V.sentries()[i]; s.pos.set(x, y, z); s.yaw = yaw; s.tilt = tilt; s.speed = 0; };
    window.__reset = () => { V.sentries().forEach(s => { s.state = 'patrol'; s.stateT = 0; s.aware = 0; s.detect = 0; s.cool = 0; s.lost = 0; s.catchT = 0; s.stun = 0; s.tuneT = 0; s.role = 'lead'; }); V.setAlert(0); G.pulseCd = 0; G.prevPos = null; G.sig = 0; };
    window.__inFront = (i, d) => { const a = V.apex(i), x = V.axis(i); G.pos.copy(a).addScaledVector(x, d); G.prevPos = null; G.vel.set(0, 0, 0); };
  });
  await ev(() => __vm.waitT(4.5)); // fin de la grâce
  const X = 30, Y = 14, Z = -30; // zone dégagée (pas de pilier, pas de nœud)
  // 1) cône de détection == cône visible
  const cm = await ev(([X, Y, Z]) => new Promise(r => { __reset(); __pin(0, X, Y, Z, 0.7, 0.3); __vm.G.pos.set(X, Y + 30, Z); requestAnimationFrame(() => requestAnimationFrame(() => { const m = __vm.coneMesh(0), a = __vm.apex(0), x = __vm.axis(0);
    const dA = Math.hypot(m.apex[0] - a.x, m.apex[1] - a.y, m.apex[2] - a.z), dX = Math.acos(Math.min(1, m.axis[0] * x.x + m.axis[1] * x.y + m.axis[2] * x.z));
    // points juste dedans / dehors du bord visible (demi-angle 30°, longueur 22 m), mesurés sur le maillage visible
    const half = 30 * Math.PI / 180, ax = new (__vm.G.pos.constructor)(...m.axis), perp = new (__vm.G.pos.constructor)(0, 1, 0).cross(ax).normalize(), ap = new (__vm.G.pos.constructor)(...m.apex);
    const at = (ang, d) => ap.clone().addScaledVector(ax, Math.cos(ang) * d).addScaledVector(perp, Math.sin(ang) * d), S = __vm.sentries()[0], save = __vm.G.pos.clone(), test = q => { __vm.G.pos.copy(q); return __vm.inCone(0); };
    const res = { dA, dX, vis: m.visible, inEdge: test(at(half - 0.02, 12)), outEdge: test(at(half + 0.02, 12)), inTip: test(ap.clone().addScaledVector(ax, 21.8)), outTip: test(ap.clone().addScaledVector(ax, 22.3)), behind: test(ap.clone().addScaledVector(ax, -1)) };
    __vm.G.pos.copy(save); r(res); })); }), [X, Y, Z]);
  ok(cm.dA < 0.05 && cm.dX < 0.01, `cône visible aligné sur la détection (sommet ${cm.dA.toFixed(3)} m, axe ${(cm.dX * 57.3).toFixed(2)}°)`);
  ok(cm.inEdge && !cm.outEdge && cm.inTip && !cm.outTip && !cm.behind, `bord du cône : dedans ${cm.inEdge}/${cm.inTip}, dehors ${!cm.outEdge}/${!cm.outTip}/${!cm.behind}`);
  // 2) patrouille → soupçon (vue) → traque (+ pare-feu +1)
  const sus = await ev(async ([X, Y, Z]) => { __reset(); await __hold(0.25, () => { __pin(0, X, Y, Z, 0.7); __inFront(0, 14); }); const s = __vm.sentries()[0]; return { st: s.state, a: s.aware, hud: document.getElementById('hSent').dataset.s }; }, [X, Y, Z]);
  ok(sus.st === 'suspicious' && sus.a > 0 && sus.a < 1 && sus.hud === 'suspicious', `vu brièvement → Soupçon (conscience ${sus.a.toFixed(2)}, HUD ${sus.hud})`);
  const hunt = await ev(async ([X, Y, Z]) => { await __hold(1.4, () => { __pin(0, X, Y, Z, 0.7); __inFront(0, 14); }); const s = __vm.sentries()[0]; return { st: s.state, al: __vm.G.alert, n: __vm.G.sentAlarms, hud: document.getElementById('hSent').textContent, mus: __vm.G.musicMode || null }; }, [X, Y, Z]);
  ok(hunt.st === 'hunt' && hunt.al >= 0.8 && hunt.n === 1 && /TRAQUE/.test(hunt.hud), `vu ~1,5 s → TRAQUE + pare-feu +1 (${hunt.st}, alerte ${hunt.al.toFixed(2)}, « ${hunt.hud} »)`);
  // 3) traque : poursuit et intercepte (se rapproche)
  const chase = await ev(async ([X, Y, Z]) => { const G = __vm.G, s = __vm.sentries()[0]; G.pos.set(X + 12, Y, Z + 12); const d0 = s.pos.distanceTo(G.pos); await __hold(0.8, () => { G.pos.set(X + 12, Y, Z + 12); G.prevPos = null; }); return { d0, d1: s.pos.distanceTo(G.pos), st: s.state }; }, [X, Y, Z]);
  ok(chase.st === 'hunt' && chase.d1 < chase.d0 - 4, `traque : fonce sur le joueur (${chase.d0.toFixed(1)} → ${chase.d1.toFixed(1)} m)`);
  // 4) ligne de vue cassée (derrière un pilier) → Recherche → Patrouille
  const lost = await ev(async () => { const G = __vm.G, s = __vm.sentries()[0]; s.pos.set(9, 10, -6); s.yaw = 0; G.pos.set(9, 10, 14); G.prevPos = null; const blocked = !__vm.los(s.pos, G.pos);
    await __hold(3.2, () => { G.pos.set(9, 10, 14); G.prevPos = null; s.pos.set(9, 10, -6); s.yaw = 0; }); return { blocked, st: s.state }; });
  ok(lost.blocked && lost.st === 'search', `pilier entre eux : ligne de vue cassée → ${lost.st}`);
  const back = await ev(async () => { const G = __vm.G, s = __vm.sentries()[0]; await __hold(7, () => { G.pos.set(-30, 30, 30); G.prevPos = null; }); return s.state; });
  ok(back === 'patrol', `Recherche sans rien trouver → ${back}`);
  // 5) pilier : dans le cône mais caché → aucune détection
  const hid = await ev(async () => { __reset(); const G = __vm.G, s = __vm.sentries()[0]; let inC = 0; await __hold(1.5, () => { __pin(0, 9, 10, -6, 0, 0); G.pos.set(9, 10, 12); G.prevPos = null; inC = __vm.inCone(0); }); return { inC, a: s.aware, st: s.state }; });
  ok(hid.inC && hid.a === 0 && hid.st === 'patrol', `caché derrière un pilier (dans le cône) : jamais vu (conscience ${hid.a}, ${hid.st})`);
  // 6) signature énergétique : immobile tout près (hors cône) = rien ; filer vite (turbo) = « Fréquence captée »
  const still = await ev(async ([X, Y, Z]) => { __reset(); const G = __vm.G, s = __vm.sentries()[0]; await __hold(1.5, () => { __pin(0, X, Y, Z, 0); G.pos.set(X, Y, Z - 6); G.prevPos = G.prevPos || G.pos.clone(); }); return { st: s.state, sig: G.sig, hud: document.getElementById('hSig').dataset.s }; }, [X, Y, Z]);
  ok(still.st === 'patrol' && still.sig < 0.12 && still.hud === 'lo', `immobile à 6 m derrière : signature ${still.sig.toFixed(2)} → indétectable (${still.st})`);
  const fast = await ev(async ([X, Y, Z]) => { __reset(); const G = __vm.G, s = __vm.sentries()[0]; let ang = 0, last = G.t, hudTxt = ''; G.prevPos = null;
    await __hold(1.2, t => { const dt = t - last; last = t; ang += dt * 28 / 10; __pin(0, X, Y, Z, 0); G.pos.set(X + Math.sin(ang) * 10, Y, Z - 2 - Math.abs(Math.cos(ang)) * 8); if (s.state === 'suspicious' && !hudTxt) hudTxt = ''; const h = document.getElementById('hSent').textContent; if (/Fréquence/.test(h)) hudTxt = h; });
    return { st: s.state, sig: G.sig, gauge: document.getElementById('hSig').dataset.s, hud: hudTxt, aura: +getComputedStyle(document.getElementById('sigAura')).opacity }; }, [X, Y, Z]);
  ok(fast.st === 'suspicious' && fast.sig > 0.6 && fast.gauge === 'hi' && /Fréquence captée/.test(fast.hud) && fast.aura > 0.2, `turbo à 10 m : signature ${fast.sig.toFixed(2)} (jauge ${fast.gauge}, aura ${fast.aura.toFixed(2)}) → « ${fast.hud} »`);
  // 7) capture : à ~2 m dans le cône pendant 0,5 s → éjecté, pare-feu +1, +8 s
  const cat = await ev(async ([X, Y, Z]) => { __reset(); const G = __vm.G, s = __vm.sentries()[0]; s.state = 'hunt'; s.aware = 1; s.cool = 5; const a0 = G.alert, r0 = G.runT; let warn = '';
    await __hold(0.9, () => { if (G.sentCatches) return; __pin(0, X, Y, Z, 0.7); __inFront(0, 0.6); s.state = 'hunt'; if (/CONTACT/.test(document.getElementById('hSent').textContent)) warn = 'CONTACT'; });
    return { n: G.sentCatches, da: G.alert - a0, dr: G.runT - r0, d: __vm.G.pos.distanceTo(s.pos), warn }; }, [X, Y, Z]);
  ok(cat.n === 1 && cat.da > 0.8 && cat.dr >= 7.9 && cat.d > 8 && cat.warn === 'CONTACT', `capture : avertissement ${cat.warn}, éjecté à ${cat.d.toFixed(1)} m, pare-feu +${cat.da.toFixed(2)}, +${cat.dr.toFixed(1)} s`);
  // 8) impulsion : brouille une sentinelle proche (3 s), puis recharge
  const st = await ev(async ([X, Y, Z]) => { __reset(); const G = __vm.G, s = __vm.sentries()[0]; __pin(0, X, Y, Z, 0.7); G.pos.set(X + 6, Y, Z); const n = __vm.pulse(); const a = s.state; await __vm.waitT(1); const seenWhile = (() => { __inFront(0, 6); return s.state; })(); await __hold(0.5, () => {}); return { n, a, b: s.state, cd: G.pulseCd, again: __vm.pulse() }; }, [X, Y, Z]);
  ok(st.n === 1 && st.a === 'stun' && st.b === 'stun' && st.cd > 10 && st.again === 0, `impulsion : sentinelle brouillée (${st.a}), aveugle même en face, recharge ${st.cd.toFixed(1)} s`);
  // 9) pare-feu ≥ 2 : la 2e sentinelle coupe la route
  const co = await ev(async ([X, Y, Z]) => { __reset(); const V = __vm, G = V.G; V.setAlert(4.2); await V.waitT(0.2); const s1 = V.sentries()[1]; s1.pos.set(X - 20, Y, Z + 20);
    await __hold(1.3, () => { __pin(0, X, Y, Z, 0.7); __inFront(0, 12); }); return { a1: s1.active, r0: V.sentries()[0].role, st1: s1.state, r1: s1.role }; }, [X, Y, Z]);
  ok(co.a1 && co.r0 === 'lead' && co.st1 === 'hunt' && co.r1 === 'cut', `coordination : S1 ${co.st1}/${co.r1} pendant que S0 traque (${co.r0})`);
  // 10) verrou : sentinelles en pause et invisibles, rien ne monte
  const lk = await ev(async () => { __reset(); const V = __vm, G = V.G; G.pos.set(-16, 6.5, -10); V.open('spoon'); const s = V.sentries()[0], p0 = s.pos.clone(); await V.waitT(2); const r = { mv: s.pos.distanceTo(p0), a: s.aware, vis: V.coneMesh(0).visible, sig: G.sig }; V.close(); return r; });
  ok(lk.mv === 0 && lk.a === 0 && !lk.vis && lk.sig < 0.05, `verrou ouvert : sentinelle figée (${lk.mv}) et cachée, signature ${lk.sig.toFixed(2)}`);
  const perf = await ev(async () => { await __vm.waitT(1); return { fps: __vm.fps(), ...__vm.renderInfo() }; });
  console.log(`fps ${perf.fps.toFixed ? perf.fps.toFixed(1) : perf.fps} · draw calls ${perf.calls} · triangles ${perf.tris}`);
  ok(errs.length === 0, `0 erreur JS ${errs.slice(0, 2).join(' | ')}`);
  console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT OK'); await b.close(); process.exit(fails ? 1 : 0);
})();
