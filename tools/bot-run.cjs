// « Joueur bot » headless : vole en ligne droite vers chaque verrou (vitesse normale, turbo parfois), reste
// LOCKT s dans chaque énigme (temps humain), puis la résout. Mesure l'engagement des sentinelles.
// ROAM = points d'exploration aléatoires avant chaque verrou (un humain cherche).
// node tools/bot-run.cjs [seed] [lockT] [roam=2]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const seed = +process.argv[2] || 3, LOCKT = +process.argv[3] || 10, ROAM = process.argv[4] === undefined ? 2 : +process.argv[4];
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  await p.goto(`http://localhost:8642/?qa=1&seed=${seed}`); await p.waitForFunction(() => window.__vm && __vm.G.phase === 'playing', null, { timeout: 120000 });
  const r = await p.evaluate(async ([LOCKT, ROAM]) => {
    const V = __vm, G = V.G, W = 36, route = ['spoon', 'rabbit', 'desert', 'choice', 'sleep', 'source'];
    const N = { spoon: [-16, 6.5, -8], rabbit: [20, 10, 12], desert: [-8, 16, 20], choice: [12, 4.5, -22], sleep: [-22, 12, -16], source: [0, 22, 0] };
    const st = { minD: 1e9, inConeT: 0, seenT: 0, states: {}, firstEngage: null, alarms: 0, catches: 0, flightT: 0, closeT: 0 };
    const wd = (a, bx, by, bz) => { let dx = bx - a.x, dz = bz - a.z; if (dx > W) dx -= 2 * W; if (dx < -W) dx += 2 * W; if (dz > W) dz -= 2 * W; if (dz < -W) dz += 2 * W; return [dx, by - a.y, dz]; };
    let last = G.t;
    const tick = () => { const dt = G.t - last; last = G.t; if (dt <= 0 || G.lockId) return;
      st.flightT += dt;
      for (const [i, s] of G.sentries.entries()) { if (!s.active || s.hidden) continue; const d = Math.hypot(...wd(G.pos, s.pos.x, s.pos.y, s.pos.z)); st.minD = Math.min(st.minD, d); if (d < 12) st.closeT += dt;
        if (V.inCone(i)) st.inConeT += dt; st.states[s.state] = (st.states[s.state] || 0) + dt; if (s.state !== 'patrol' && s.state !== 'return' && st.firstEngage == null) st.firstEngage = +G.t.toFixed(1); } };
    const fly = id => new Promise(res => { last = G.t; const f = () => { if (G.phase !== 'playing') return requestAnimationFrame(f); tick(); const [x, y, z] = Array.isArray(id) ? id : N[id], d = wd(G.pos, x, y, z), L = Math.hypot(...d);
      if (L < 2.6) return res(); const dt = Math.min(0.1, G._bt ? G.t - G._bt : 0); G._bt = G.t; const sp = 14 * ((G.t % 9) < 3 ? 2.05 : 1); G.boostBot = (G.t % 9) < 3; // turbo 1/3 du temps
      const k = Math.min(L, sp * dt) / L; G.pos.x += d[0] * k; G.pos.y += d[1] * k; G.pos.z += d[2] * k; G.yaw = Math.atan2(-d[0], -d[2]); G.vel.set(d[0] / L * sp, d[1] / L * sp, d[2] / L * sp); requestAnimationFrame(f); }; f(); });
    const t0 = G.t;
    let rs = 7; const rr = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
    for (const id of route) { for (let w = 0; w < ROAM; w++) await fly([rr() * 64 - 32, 3 + rr() * 20, rr() * 64 - 32]); await fly(id); G._bt = 0; if (G.opened.has(id)) continue; V.open(id); await V.waitT(id === 'source' ? 4 : LOCKT); V.solve(id); await V.waitT(0.4); if (!G.opened.has(id)) { V.solve(id); await V.waitT(0.4); } }
    st.alarms = G.sentAlarms || 0; st.catches = G.sentCatches || 0; st.runT = +(G.t - t0).toFixed(1); st.opened = G.opened.size; st.alert = +G.alert.toFixed(2);
    for (const k in st.states) st.states[k] = +st.states[k].toFixed(1); st.inConeT = +st.inConeT.toFixed(1); st.flightT = +st.flightT.toFixed(1); st.closeT = +st.closeT.toFixed(1); st.minD = +st.minD.toFixed(1); return st; }, [LOCKT, ROAM]);
  console.log(JSON.stringify({ seed, ...r, errs: errs.length }), errs.slice(0, 2).join(' | '));
  await b.close();
})();
