// Sentinelles : modèle procédural (calmar mécanique) + patrouille, cône de détection, traque brève.
// Modèle maison inspiré de la silhouette des films : tête en plaques empilées, 7 yeux rouges, 4 mandibules,
// 12 tentacules à anneaux qui ondulent avec retard. Peu d'appels de dessin : tête fusionnée, tout le reste instancié.
import * as THREE from '../vendor/three.module.min.js';

export const SENT = {
  range: 18, half: 24 * Math.PI / 180, tilt: 0.42, // cône : portée (m), demi-angle, inclinaison vers le bas (rad)
  detectT: 1.5, cool: 10, chaseT: 5, lose: 26, safe: 5, grace: 10, // secondes / mètres
  patrol: 4.5, chase: 10, keep: 4,
};
// Deux boucles de patrouille, loin des nœuds (les nœuds restent des zones sûres de toute façon).
const PATHS = [
  [[0, 15, -30], [27, 17, -14], [30, 14, 18], [10, 18, 31], [-20, 15, 30], [-31, 18, 4], [-27, 15, -24]],
  [[-12, 31, 12], [12, 33, 14], [16, 30, -10], [-6, 32, -16], [-17, 30, -2]],
];

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
  const cone = new THREE.Mesh(coneG, coneMat); cone.position.set(0, 0, 1.5); cone.rotation.x = SENT.tilt; body.add(cone);
  // Racines des tentacules sur le collier arrière.
  const roots = Array.from({ length: NT }, (_, i) => { const a = (i / NT) * Math.PI * 2 + 0.2; return { a, ph: i * 1.7, rad: new THREE.Vector3(Math.cos(a), Math.sin(a), 0), tan: new THREE.Vector3(-Math.sin(a), Math.cos(a), 0) }; });
  const dir = new THREE.Vector3(), p = new THREE.Vector3(), mid = new THREE.Vector3();
  let speedS = 0;
  function update(t, dt, o) { // o : { speed, detect 0..1, lunge 0..1, cone }
    speedS += ((o.speed || 0) - speedS) * Math.min(1, dt * 2); const straight = Math.min(1, speedS / 9);
    body.position.y = Math.sin(t * 1.3) * 0.18; body.rotation.z = Math.sin(t * 0.7) * 0.06;
    const k = 0.12 + 0.88 * (o.detect || 0); eyeMat.color.setRGB(1, 0.23 + 0.6 * k * k, 0.19 + 0.5 * k * k); halo.material.opacity = 0.35 + 0.6 * k; halo.scale.setScalar(2.2 + 2.6 * k);
    cone.visible = o.cone !== false; coneMat.opacity = 0.05 + 0.13 * k;
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
const tv = new THREE.Vector3(), axis = new THREE.Vector3(), fwd = new THREE.Vector3();
export function makeSentries() {
  return PATHS.map((path, i) => ({ i, path: path.map(a => new THREE.Vector3(...a)), wp: 1, pos: new THREE.Vector3(...path[0]), dir: new THREE.Vector3(1, 0, 0), state: 'patrol', detect: 0, cool: 0, chase: 0, lunge: 0, speed: 0, active: i === 0, hidden: false, alerts: 0, beepAt: 0 }));
}
export function resetSentries(list) { list.forEach((s, i) => { s.pos.copy(s.path[0]); s.wp = 1; s.dir.subVectors(s.path[1], s.path[0]).normalize(); s.state = 'patrol'; s.detect = s.cool = s.chase = s.lunge = s.speed = 0; s.alerts = 0; s.active = i === 0; s.hidden = false; }); }
// Axe du cône dans le monde : direction de la tête inclinée vers le bas.
export function coneAxis(s, out = axis) { fwd.copy(s.dir).setY(0); if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize(); return out.copy(fwd).multiplyScalar(Math.cos(SENT.tilt)).setY(-Math.sin(SENT.tilt)).normalize(); }
export function inCone(s, p) { tv.subVectors(p, s.pos); const d = tv.length(); if (d > SENT.range || d < 0.01) return false; return tv.dot(coneAxis(s)) / d > Math.cos(SENT.half); }

// ctx : { G, frozen, safe(pos) → bool, alarm(s), beep(k), wrap(v) }
export function stepSentries(list, dt, ctx) {
  const G = ctx.G;
  list[1].active = G.alertLvl >= 2 || list[1].state !== 'patrol';
  for (const s of list) {
    if (!s.active || s.hidden || ctx.frozen) { s.speed = 0; continue; }
    s.cool = Math.max(0, s.cool - dt); s.lunge = Math.max(0, s.lunge - dt * 1.5);
    const seen = G.t > SENT.grace && s.cool === 0 && !ctx.safe(G.pos) && inCone(s, G.pos);
    if (seen) s.detect = Math.min(1, s.detect + dt / SENT.detectT); else s.detect = Math.max(0, s.detect - dt / SENT.detectT * 1.5);
    if (s.detect > 0.05 && G.t >= s.beepAt) { ctx.beep(s.detect); s.beepAt = G.t + 0.55 - 0.35 * s.detect; }
    if (s.detect >= 1) { s.detect = 0; s.cool = SENT.cool; s.state = 'chase'; s.chase = SENT.chaseT; s.lunge = 1; s.alerts++; ctx.alarm(s); }
    let target, sp;
    if (s.state === 'chase') {
      s.chase -= dt; const d = ctx.wrap(s.pos, G.pos), L = d.length();
      if (s.chase <= 0 || L > SENT.lose || ctx.safe(G.pos)) s.state = 'return';
      target = tv.copy(s.pos).add(d); sp = L > SENT.keep ? SENT.chase : 0;
    }
    if (s.state === 'return' || s.state === 'patrol') {
      target = s.path[s.wp]; sp = SENT.patrol;
      if (s.pos.distanceTo(target) < 1.5) { s.wp = (s.wp + 1) % s.path.length; s.state = 'patrol'; }
    }
    tv.subVectors(target, s.pos); const L = tv.length();
    if (L > 1e-3) { tv.divideScalar(L); s.dir.lerp(tv, 1 - Math.exp(-(s.state === 'chase' ? 5 : 1.6) * dt)).normalize(); }
    s.speed += (sp - s.speed) * Math.min(1, dt * 2.5); s.pos.addScaledVector(s.dir, Math.min(s.speed * dt, Math.max(0, L - (s.state === 'chase' ? SENT.keep : 0))));
  }
}
