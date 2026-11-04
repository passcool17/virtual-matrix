// Sentinelles : modèle procédural (calmar mécanique) + patrouille, cône de détection, traque brève.
// Modèle maison inspiré de la silhouette des films : tête en plaques empilées, 7 yeux rouges, 4 mandibules,
// 12 tentacules à anneaux qui ondulent avec retard. Peu d'appels de dessin : tête fusionnée, tout le reste instancié.
import * as THREE from '../vendor/three.module.min.js';

export const SENT = {
  range: 22, half: 30 * Math.PI / 180, tilt: 0.3, eye: 1.5, // cône de vision : longueur (m), demi-angle, inclinaison par défaut, sommet à 1,5 m devant le centre (aux yeux)
  see: 0.8, grace: 4, safe: 3.6, cool: 8,                   // s de vue pour passer en traque (à bout portant ~0,55 s, au bout du cône ~1,6 s) ; grâce de début ; zone sûre = portée de crochetage
  sigMin: 4, sigMax: 22, sigOn: 0.12,                        // signature énergétique : rayon de captation 4 → 22 m selon la vitesse ; sous 0,12 (flottement lent) = indétectable
  lostT: 2.5, searchT: 6, suspT: 5,                          // perte de vue → recherche ; durée de recherche ; soupçon sans confirmation
  patrol: 5, investigate: 7, hunt: 11.5, catchR: 2.4, catchT: 0.5, stunT: 3,
};
// ---------- géométrie ----------
function merge(parts) { // [[geometry, matrix]] → une géométrie non indexée (position + normale)
  const pos = [], nor = [];
  for (const [g0, m] of parts) { const g = g0.index ? g0.toNonIndexed() : g0; g.applyMatrix4(m); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
}
const M = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

function matcap() { // métal gris foncé, reflet blanc, liseré vert matrice
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  let r = g.createRadialGradient(64, 64, 10, 64, 64, 64); r.addColorStop(0, '#59625d'); r.addColorStop(0.65, '#262c29'); r.addColorStop(0.9, '#121614'); r.addColorStop(1, '#2f7a48');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  r = g.createRadialGradient(44, 38, 0, 44, 38, 26); r.addColorStop(0, 'rgba(235,255,240,.95)'); r.addColorStop(1, 'rgba(235,255,240,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

let shared = null;
function sharedAssets() {
  if (shared) return shared;
  const S = (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
  const head = merge([
    [S(1, 18, 12), M(0, 0, 0, 1.15, 0.95, 1.45)],                       // crâne
    [S(1, 16, 10), M(0, -0.1, 0.95, 0.95, 0.8, 0.55)],                  // plaque frontale
    [S(1, 12, 8), M(0, 0.72, -0.75, 0.62, 0.3, 0.5)],                   // plaques dorsales empilées
    [S(1, 12, 8), M(0, 0.82, 0, 0.66, 0.3, 0.55)],
    [S(1, 12, 8), M(0, 0.7, 0.72, 0.56, 0.28, 0.45)],
    [S(1, 10, 8), M(0.82, 0.25, 0.3, 0.32, 0.38, 0.85)],                // capsules latérales
    [S(1, 10, 8), M(-0.82, 0.25, 0.3, 0.32, 0.38, 0.85)],
    [new THREE.CylinderGeometry(0.42, 0.42, 0.62, 10), M(0.55, 0.42, 1.1, 1, 1, 1, Math.PI / 2)], // tubes à « yeux »
    [new THREE.CylinderGeometry(0.42, 0.42, 0.62, 10), M(-0.55, 0.42, 1.1, 1, 1, 1, Math.PI / 2)],
    [new THREE.TorusGeometry(0.78, 0.13, 6, 16), M(0, 0, -1.2)],           // collier des tentacules
    [S(1, 12, 8), M(0, -0.62, 0.55, 0.75, 0.32, 0.6)],                  // menton
  ]);
  const seg = merge([[new THREE.CylinderGeometry(0.8, 1, 1, 7, 1, true), M()], [new THREE.CylinderGeometry(1.25, 1.25, 0.28, 7), M(0, -0.32)]]); // anneau = 1 segment
  const claw = merge([[new THREE.ConeGeometry(1, 1, 5), M(0, 0.5)], [new THREE.ConeGeometry(0.45, 0.9, 4), M(0.55, 0.2, 0, 1, 1, 1, 0, 0, -0.5)], [new THREE.ConeGeometry(0.45, 0.9, 4), M(-0.55, 0.2, 0, 1, 1, 1, 0, 0, 0.5)]]);
  const mand = merge([[new THREE.CylinderGeometry(0.06, 0.1, 0.7, 5), M(0, -0.35)], [new THREE.ConeGeometry(0.08, 0.55, 5), M(0, -0.85, 0.12, 1, 1, 1, 0.5 + Math.PI)]]);
  const mat = new THREE.MeshMatcapMaterial({ matcap: matcap(), color: 0xb8c4bc });
  shared = { head, seg, claw, mand, mat, eye: new THREE.SphereGeometry(0.12, 8, 6) }; return shared;
}

const NT = 12, NS = 14, EYES = [[0, 0.05], [0.26, 0.16], [-0.26, 0.16], [0.3, -0.14], [-0.3, -0.14], [0.12, -0.32], [-0.12, -0.32]];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

export function createSentinelModel(glow) {
  const A = sharedAssets(), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const head = new THREE.Mesh(A.head, A.mat); body.add(head);
  const segs = new THREE.InstancedMesh(A.seg, A.mat, NT * NS), claws = new THREE.InstancedMesh(A.claw, A.mat, NT), mands = new THREE.InstancedMesh(A.mand, A.mat, 4);
  for (const im of [segs, claws, mands]) { im.frustumCulled = false; body.add(im); }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 }), eyes = new THREE.InstancedMesh(A.eye, eyeMat, EYES.length);
  EYES.forEach(([x, y], i) => eyes.setMatrixAt(i, _m.makeTranslation(x, y - 0.05, 1.45 - Math.abs(x) * 0.25 - Math.abs(y) * 0.2))); body.add(eyes);
  const halo = glow(0xff3b30, 2.4, 0.55); halo.position.set(0, 0, 1.6); body.add(halo);
  // Cône de recherche : sommet aux yeux, axe vers l'avant, incliné vers le bas (comme la détection).
  const L = SENT.range, coneMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coneG = new THREE.ConeGeometry(Math.tan(SENT.half) * L, L, 20, 1, true); coneG.translate(0, -L / 2, 0); coneG.rotateX(-Math.PI / 2); // sommet à l'origine, ouverture vers +Z
  const cone = new THREE.Mesh(coneG, coneMat); cone.position.set(0, 0, SENT.eye); cone.rotation.x = SENT.tilt; g.add(cone); // enfant du groupe (pas du corps qui oscille) : le cône visible = le cône de détection
  // Racines des tentacules sur le collier arrière.
  const roots = Array.from({ length: NT }, (_, i) => { const a = (i / NT) * Math.PI * 2 + 0.2; return { a, ph: i * 1.7, rad: new THREE.Vector3(Math.cos(a), Math.sin(a), 0), tan: new THREE.Vector3(-Math.sin(a), Math.cos(a), 0) }; });
  const dir = new THREE.Vector3(), p = new THREE.Vector3(), mid = new THREE.Vector3();
  let speedS = 0;
  function update(t, dt, o) { // o : { tune (capte une signature),  speed, detect 0..1, lunge 0..1, cone }
    speedS += ((o.speed || 0) - speedS) * Math.min(1, dt * 2); const straight = Math.min(1, speedS / 9);
    body.position.y = Math.sin(t * 1.3) * 0.18; body.rotation.z = Math.sin(t * 0.7) * 0.06;
    const k = 0.12 + 0.88 * (o.detect || 0); eyeMat.color.setRGB(1, 0.23 + 0.6 * k * k, 0.19 + 0.5 * k * k); halo.material.opacity = 0.35 + 0.6 * k; halo.scale.setScalar(2.2 + 2.6 * k);
    cone.visible = o.cone !== false; coneMat.opacity = (0.05 + 0.13 * k) * (o.tune ? 0.6 + 0.4 * Math.abs(Math.sin(t * 23)) : 1);
    if (o.tune) halo.scale.setScalar((2.2 + 2.6 * k) * (1 + 0.35 * Math.abs(Math.sin(t * 17)))); // syntonisation : le halo balaie les fréquences cone.rotation.x = o.tilt ?? SENT.tilt;
    for (let i = 0; i < NT; i++) {
      const r = roots[i]; p.set(r.rad.x * 0.78, r.rad.y * 0.78, -1.2);
      dir.set(r.rad.x * 0.75, r.rad.y * 0.75 - 0.15, -1).normalize();
      for (let j = 0; j < NS; j++) {
        const w = t * (1.6 + straight) + r.ph - j * 0.42, amp = (0.16 + 0.05 * Math.sin(t * 0.3 + r.ph)) * (1 - 0.6 * straight);
        dir.addScaledVector(r.rad, amp * Math.sin(w) - 0.05 * straight).addScaledVector(r.tan, amp * 0.7 * Math.cos(w * 0.8)); dir.z -= 0.08 + 0.25 * straight; dir.y -= 0.02 * (1 - straight); dir.normalize();
        const len = 0.42 * (1 - j * 0.025), rad = 0.12 * (1 - j * 0.045);
        mid.copy(p).addScaledVector(dir, len / 2); _q.setFromUnitVectors(UP, _v.copy(dir).negate()); segs.setMatrixAt(i * NS + j, _m.compose(mid, _q, _s.set(rad, len, rad)));
        p.addScaledVector(dir, len);
      }
      _q.setFromUnitVectors(UP, dir); claws.setMatrixAt(i, _m.compose(p, _q, _s.set(0.11, 0.42, 0.11)));
    }
    segs.instanceMatrix.needsUpdate = true; claws.instanceMatrix.needsUpdate = true;
    const open = 0.25 + 0.2 * Math.sin(t * 5) * (o.detect || 0) + 0.7 * (o.lunge || 0);
    [[0.3, 1], [-0.3, 1], [0.55, 0.6], [-0.55, 0.6]].forEach(([x, s], i) => { _q.setFromEuler(new THREE.Euler(-0.5 - open * s, 0, x * (0.6 + open))); mands.setMatrixAt(i, _m.compose(_v.set(x * 0.8, -0.55, 1.05 - Math.abs(x) * 0.4), _q, _s.set(1, s + 0.4, 1))); });
    mands.instanceMatrix.needsUpdate = true;
  }
  return { group: g, update, cone };
}

// ---------- comportement ----------
// États : patrol → suspicious (vu ou entendu : se tourne, va voir) → hunt (poursuite avec interception ; la 2e coupe la route)
//         → search (balaie autour du dernier point vu) → patrol. stun = brouillée par l'impulsion du joueur.
const tv = new THREE.Vector3(), tw = new THREE.Vector3(), fwd = new THREE.Vector3(), ax = new THREE.Vector3();
const mk = i => ({ i, pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), yaw: 0, tilt: SENT.tilt, wp: new THREE.Vector3(), wpId: null, state: 'patrol', stateT: 0,
  aware: 0, detect: 0, last: new THREE.Vector3(), lastV: new THREE.Vector3(), lost: 0, catchT: 0, stun: 0, cool: 0, lunge: 0, speed: 0, role: 'lead', active: i === 0, hidden: false, alerts: 0, catches: 0, beepAt: 0, heard: 0, seen: false });
const START = [[-30, 14, -30], [30, 26, 30]];
export function makeSentries() { const l = [mk(0), mk(1)]; resetSentries(l); return l; }
export function resetSentries(list) { list.forEach((s, i) => { Object.assign(s, mk(i), { pos: new THREE.Vector3(...START[i]) }); s.wp.copy(s.pos); }); }
export const yawOf = v => Math.atan2(v.x, v.z);
// Axe et sommet du cône dans le monde : exactement ceux du maillage (groupe tourné de yaw, cône à SENT.eye devant, incliné de tilt).
export function coneAxis(s, out = ax) { return out.set(Math.sin(s.yaw) * Math.cos(s.tilt), -Math.sin(s.tilt), Math.cos(s.yaw) * Math.cos(s.tilt)); }
export function coneApex(s, out = tw) { return out.set(s.pos.x + Math.sin(s.yaw) * SENT.eye, s.pos.y, s.pos.z + Math.cos(s.yaw) * SENT.eye); }
// rel = vecteur sommet→point (déjà replié). Dans le cône = projection sur l'axe dans ]0, range] et angle ≤ demi-angle.
function relInCone(s, rel) { const a = coneAxis(s), pr = rel.dot(a), L = rel.length(); return pr > 0 && pr <= SENT.range && pr / Math.max(L, 1e-6) >= Math.cos(SENT.half) ? pr : 0; }
export function inCone(s, p, wrap) { coneApex(s); const rel = wrap ? wrap(tw, p) : tv.subVectors(p, tw); return relInCone(s, rel) > 0; }
// Ligne de vue : segment a → a+rel contre les piliers [x, z, r, h] (cylindres verticaux) et les sphères [x, y, z, r].
export function losClear(a, rel, occ, wrap) {
  for (const o of occ.pillars) { const d = wrap(a, tv.set(o[0], 0, o[1])); d.y = 0; const rr = rel.x * rel.x + rel.z * rel.z; const t = rr > 1e-6 ? Math.max(0, Math.min(1, (d.x * rel.x + d.z * rel.z) / rr)) : 0;
    const cx = rel.x * t - d.x, cz = rel.z * t - d.z; if (cx * cx + cz * cz < o[2] * o[2] && a.y + rel.y * t < o[3]) return false; }
  for (const o of occ.spheres) { const d = wrap(a, tv.set(o[0], o[1], o[2])); const rr = rel.lengthSq(); const t = rr > 1e-6 ? Math.max(0, Math.min(1, d.dot(rel) / rr)) : 0; if (fwd.copy(rel).multiplyScalar(t).sub(d).lengthSq() < o[3] * o[3]) return false; }
  return true;
}
const go = (s, st) => { if (s.state !== st) { s.state = st; s.stateT = 0; } };
const turn = (cur, to, k) => { let d = to - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return cur + d * k; };

// ctx : { G, frozen, safe(p), wrap(a,b) → delta (copie), occ, sigR (m : rayon de captation de la signature énergétique), targets() → [Vector3], alarm(s), beep(k), caught(s), rnd() }
export function stepSentries(list, dt, ctx) {
  const G = ctx.G, wrap = ctx.wrap; ctx.list = list;
  list[1].active = G.alertLvl >= 2 || list[1].state !== 'patrol';
  // 1) sens
  for (const s of list) {
    s.seen = false; s.heard = 0; s.tuneT = Math.max(0, (s.tuneT || 0) - dt); if (!s.active || s.hidden || ctx.frozen || s.state === 'stun' || G.t < SENT.grace || ctx.safe(G.pos)) continue;
    const rel = wrap(coneApex(s), G.pos), pr = relInCone(s, rel);
    if (pr && losClear(tw, rel, ctx.occ, wrap)) { s.seen = true; s.seenK = 1.5 - pr / SENT.range; }
    if (!s.seen && ctx.sigR > 0 && wrap(s.pos, G.pos).length() < ctx.sigR) { s.heard = 1; s.tuneT = 1.2; }
  }
  const hunters = list.filter(s => s.active && !s.hidden && s.state === 'hunt'), teamSees = list.some(s => s.seen);
  // 2) décision + déplacement
  for (const s of list) {
    if (!s.active || s.hidden || ctx.frozen) { s.speed = 0; continue; }
    s.stateT += dt; s.cool = Math.max(0, s.cool - dt); s.lunge = Math.max(0, s.lunge - dt * 1.5);
    const toP = wrap(s.pos, G.pos), dP = toP.length();
    if (s.seen) { s.last.copy(s.pos).add(toP); s.lastV.copy(G.vel); s.lost = 0; }
    if (s.state === 'stun') { s.stun -= dt; s.speed *= Math.exp(-4 * dt); s.tilt = 0.9; s.aware = 0; if (s.stun <= 0) { go(s, 'search'); s.tilt = SENT.tilt; } }
    else if (s.state === 'patrol' || s.state === 'suspicious' || s.state === 'search') {
      if (s.seen) { s.aware = Math.min(1, s.aware + dt / SENT.see * s.seenK); if (s.state !== 'suspicious') { go(s, 'suspicious'); } }
      else if (s.heard) { s.aware = Math.min(0.9, Math.max(s.aware, 0.35) + dt * 0.2); s.last.copy(s.pos).add(toP); if (s.state !== 'suspicious') go(s, 'suspicious'); else s.stateT = Math.min(s.stateT, 1); }
      else s.aware = Math.max(0, s.aware - dt * (s.state === 'patrol' ? 0.3 : 0.12));
      if (s.aware >= 1) startHunt(s, ctx, 'lead');
      else if (s.state === 'suspicious' && !s.seen && s.stateT > SENT.suspT) go(s, 'search');
      else if (s.state === 'search' && s.stateT > SENT.searchT) { go(s, 'patrol'); s.wpId = null; }
    } else if (s.state === 'hunt') {
      if (!s.seen) { if (teamSees) { const o = list.find(x => x.seen); s.last.copy(o.last); s.lastV.copy(o.lastV); s.lost = 0; } else s.lost += dt; }
      if (s.lost > SENT.lostT || ctx.safe(G.pos)) { go(s, 'search'); s.aware = 0.5; s.catchT = 0; s.last.addScaledVector(s.lastV, 0.8); }
      else if (dP < SENT.catchR && s.seen) { s.catchT += dt; s.lunge = 1; if (s.catchT >= SENT.catchT) { s.catchT = 0; s.catches++; ctx.caught(s); go(s, 'search'); s.aware = 0; s.stun = 0; s.cool = Math.max(s.cool, 3); s.last.copy(s.pos); } }
      else s.catchT = Math.max(0, s.catchT - dt);
    }
    s.detect = s.state === 'hunt' ? 1 : s.state === 'stun' ? 0 : s.aware;
    if ((s.state === 'suspicious' || s.state === 'hunt') && G.t >= s.beepAt) { ctx.beep(s.state === 'hunt' ? 1 : s.aware); s.beepAt = G.t + (s.state === 'hunt' ? 0.22 : 0.55 - 0.3 * s.aware); }
    // cible
    let sp = 0, look = null; tv.set(0, 0, 0);
    if (s.state === 'patrol') {
      if (!s.wpId || s.pos.distanceTo(s.wp) < 2) pickWp(s, list, ctx);
      tv.subVectors(s.wp, s.pos); sp = SENT.patrol; fwd.copy(tv); look = yawOf(fwd) + Math.sin(G.t * 0.9 + s.i * 2) * 0.55; s.tilt += (SENT.tilt - s.tilt) * Math.min(1, dt * 2); // balaie de gauche à droite en patrouillant
    } else if (s.state === 'suspicious' || s.state === 'search') {
      const at = wrap(s.pos, s.last); tv.copy(at); const d = at.length();
      sp = s.state === 'suspicious' ? (d > 6 ? SENT.investigate : 0) : (d > 3 ? SENT.investigate : 0);
      look = s.state === 'search' && d < 4 ? s.yaw + dt * 1.6 : yawOf(at); aimTilt(s, at, dt); // recherche : tourne sur place autour du dernier point vu
    } else if (s.state === 'hunt') {
      const lead = Math.min(1.2, dP / SENT.hunt) * (s.role === 'cut' ? 2 : 1);
      const tgt = tw.copy(s.lost > 0 ? s.last : fwd.copy(s.pos).add(toP)).addScaledVector(s.lost > 0 ? s.lastV : G.vel, lead);
      if (s.role === 'cut') { const v = fwd.copy(G.vel).setY(0); if (v.lengthSq() > 1) { v.normalize(); tgt.x += -v.z * 5; tgt.z += v.x * 5; } } // coupe la route sur le flanc
      tv.copy(wrap(s.pos, tgt)); sp = SENT.hunt; look = yawOf(toP); aimTilt(s, toP, dt);
    }
    if (look != null) s.yaw = turn(s.yaw, look, 1 - Math.exp(-(s.state === 'hunt' ? 6 : 2.5) * dt));
    const L = tv.length(); if (L > 1e-3) { tv.divideScalar(L); s.dir.lerp(tv, 1 - Math.exp(-(s.state === 'hunt' ? 5 : 2) * dt)).normalize(); }
    s.speed += (sp - s.speed) * Math.min(1, dt * 2.5); s.pos.addScaledVector(s.dir, Math.min(s.speed * dt, L)); s.pos.y = Math.max(2, Math.min(40, s.pos.y));
    for (const o of ctx.occ.pillars) { const d = wrap(tw.set(o[0], s.pos.y, o[1]), s.pos); d.y = 0; const r = o[2] + 1.6, l = d.length(); if (l < r && s.pos.y < o[3] + 1) s.pos.addScaledVector(d, (r - l) / Math.max(l, 1e-3)); } // contourne les piliers
  }
}
function aimTilt(s, rel, dt) { const h = Math.hypot(rel.x, rel.z), want = Math.max(-0.7, Math.min(0.9, Math.atan2(-rel.y, Math.max(h, 0.1)))); s.tilt += (want - s.tilt) * Math.min(1, dt * 3); }
function startHunt(s, ctx, role) {
  go(s, 'hunt'); s.role = role; s.aware = 1; s.lost = 0; s.lunge = 1; s.catchT = 0;
  if (role === 'lead' && s.cool === 0) { s.alerts++; s.cool = SENT.cool; ctx.alarm(s); }
  if (role === 'lead') for (const o of ctx.list || []) if (o !== s && o.active && !o.hidden && o.state !== 'hunt' && o.state !== 'stun') { o.last.copy(s.last); o.lastV.copy(s.lastV); startHunt(o, ctx, 'cut'); }
}
// Patrouille : file vers un verrou encore utile au joueur, en préférant ceux près de lui ; jamais le même que l'autre sentinelle.
function pickWp(s, list, ctx) {
  const G = ctx.G, T = ctx.targets(); if (!T.length) return;
  let best = null, bs = Infinity; for (const t of T) { const id = `${t.x},${t.z}`; if (id === s.wpId || list.some(o => o !== s && o.wpId === id)) continue; const sc = ctx.wrap(G.pos, t).length() + ctx.rnd() * 14; if (sc < bs) { bs = sc; best = t; } }
  best = best || T[0]; s.wpId = `${best.x},${best.z}`; const a = ctx.rnd() * Math.PI * 2; s.wp.set(best.x + Math.cos(a) * 9, Math.max(3, best.y + 3), best.z + Math.sin(a) * 9);
}
export function stunSentry(s) { s.state = 'stun'; s.stateT = 0; s.stun = SENT.stunT; s.aware = 0; s.catchT = 0; s.detect = 0; }
