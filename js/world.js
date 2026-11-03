// Monde 3D : grille, pluie, noyau, nœuds verrouillés, indices flottants, sentinelle.
import * as THREE from '../vendor/three.module.min.js';
import { COL, NODES, CLUES } from './config.js';

const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const glow = (color, s, op = 0.5) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(s); return m; };

function textSprite(lines) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.font = '44px "Share Tech Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#5dff8a'; g.shadowBlur = 16; g.fillStyle = '#c8ffd4';
  lines.forEach((l, i) => g.fillText(l, 256, 64 + (i - (lines.length - 1) / 2) * 48));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.scale.set(4.6, 1.15, 1); return s;
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
  const baseDpr = Math.min(devicePixelRatio || 1, 1.75); let resScale = 1; renderer.setPixelRatio(baseDpr); renderer.setClearColor(COL.bg);
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(COL.bg, 0.03);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 180); camera.rotation.order = 'YXZ';

  // Sol
  const fc = document.createElement('canvas'); fc.width = fc.height = 32; const fg = fc.getContext('2d');
  fg.fillStyle = '#040806'; fg.fillRect(0, 0, 32, 32); fg.fillStyle = '#0d2818'; fg.fillRect(0, 0, 32, 1); fg.fillRect(0, 0, 1, 32); fg.fillStyle = '#1a4a28'; fg.fillRect(0, 0, 1, 1);
  const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(28, 28); ft.magFilter = THREE.NearestFilter;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ map: ft, color: 0x7ab98a, transparent: true, opacity: 0.55 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);

  // Treillis + cubes aux intersections
  const pts = [], R = 32, S = 8;
  for (let a = -R; a <= R; a += S) for (let b = 0; b <= 64; b += S) { pts.push(-R, b, a, R, b, a, a, b, -R, a, b, R); }
  for (let a = -R; a <= R; a += S) for (let c = -R; c <= R; c += S) pts.push(a, 0, c, a, 64, c);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: COL.lattice, transparent: true, opacity: 0.38 })));
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshBasicMaterial({ color: COL.nodeDim }), 405); const m4 = new THREE.Matrix4(); let ci = 0;
  for (let x = -R; x <= R; x += S) for (let y = 0; y <= 32; y += S) for (let z = -R; z <= R; z += S) cubes.setMatrixAt(ci++, m4.makeTranslation(x, y, z)); scene.add(cubes);

  // Pluie 3D
  const N = 420, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: COL.rain, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false }), N);
  const drops = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 78, y: Math.random() * 48, z: (Math.random() - 0.5) * 78, h: 0.5 + Math.random() * 2.2, s: 0.6 + Math.random() * 1.4 })); scene.add(rain);
  const rainGreen = new THREE.Color(COL.rain), rainRed = new THREE.Color(COL.red);

  // Noyau, faisceau, paquets
  const core = new THREE.Group(); core.position.set(0, 10, 0); scene.add(core);
  const cm = new THREE.MeshBasicMaterial({ color: COL.core, wireframe: true, transparent: true, opacity: 0.55 });
  const tori = [2.4, 1.7, 1.1].map((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 48), cm); t.rotation.x = i * 1.1; core.add(t); return t; });
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: COL.core }))); core.add(glow(COL.core, 7, 0.35));
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 40, 8, 1, true), new THREE.MeshBasicMaterial({ color: COL.node, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = 20; scene.add(beam);
  const packets = Array.from({ length: 28 }, (_, i) => { const p = new THREE.Mesh(new THREE.OctahedronGeometry(1), new THREE.MeshBasicMaterial({ color: COL.packet })); p.scale.setScalar(0.18); p.userData = { r: 8 + (i % 7) * 3.2, y: 3 + (i % 5) * 4.5, w: 0.12 + (i % 5) * 0.04, a: i * 2.4 }; scene.add(p); return p; });

  // Nœuds (octaèdre + halo + cage de verrou)
  const nodes = {};
  for (const n of NODES) {
    const g = new THREE.Group(); g.position.set(n.x, n.y, n.z); scene.add(g);
    const mat = new THREE.MeshBasicMaterial({ color: COL.node }), oct = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), mat); g.add(oct);
    const halo = glow(COL.node, 2.6, 0.55); g.add(halo);
    const cageMat = new THREE.LineBasicMaterial({ color: 0xff5a4e, transparent: true, opacity: 0.7 });
    const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.7, 1.7)), cageMat); g.add(cage);
    nodes[n.id] = { g, oct, mat, halo, cage, open: false };
  }

  // Indices flottants
  const clues = {};
  for (const c of CLUES) { const base = NODES.find(n => n.id === c.near); const pos = new THREE.Vector3(base.x + c.off[0], base.y + c.off[1], base.z + c.off[2]); clues[c.id] = { pos, sprite: null }; }
  function setClue(id, lines) { const c = clues[id]; if (c.sprite) scene.remove(c.sprite); c.sprite = textSprite(lines); c.sprite.position.copy(c.pos); scene.add(c.sprite); }

  // Sentinelle
  const sent = new THREE.Group(); sent.visible = false; scene.add(sent);
  const sm = new THREE.MeshBasicMaterial({ color: COL.red, wireframe: true });
  const sOuter = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), sm), sInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), new THREE.MeshBasicMaterial({ color: 0xffb0a8 }));
  const spikes = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 0), new THREE.MeshBasicMaterial({ color: COL.red, wireframe: true, transparent: true, opacity: 0.35 }));
  sent.add(sOuter, sInner, spikes, glow(COL.red, 6, 0.7));

  let frames = 0, fpsT = performance.now(), fps = 0;
  function resize() { const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  function render(G, dt) {
    const t = G.t;
    camera.position.set(G.pos.x, G.pos.y, G.pos.z); camera.rotation.set(G.pitch, G.yaw, 0);
    if (G.trauma > 0) { const k = G.trauma * G.trauma * 0.35; camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; }
    const dec = G.opened.size, red = Math.min(1, G.redMix);
    rain.material.color.copy(rainGreen).lerp(rainRed, red); rain.material.opacity = 0.48 + red * 0.2;
    scene.fog.density += ((G.alertLvl >= 2 ? 0.075 : 0.03) - scene.fog.density) * Math.min(1, dt * 1.5);
    for (let i = 0; i < N; i++) { const d = drops[i]; d.y -= d.s * 7 * (1 + 0.12 * dec) * dt; if (d.y < 0) d.y += 48; m4.makeScale(0.035, d.h, 0.035).setPosition(d.x, d.y, d.z); rain.setMatrixAt(i, m4); }
    rain.instanceMatrix.needsUpdate = true;
    const spin = 0.14 + 0.06 * dec; tori.forEach((tr, i) => { tr.rotation.y = t * spin * (i + 1); tr.rotation.z = t * spin * 0.5 * (i % 2 ? -1 : 1); });
    for (const p of packets) { const u = p.userData, a = u.a + t * u.w; p.position.set(Math.cos(a) * u.r, u.y + Math.sin(t + u.a) * 0.6, Math.sin(a) * u.r); p.rotation.y = t; }
    for (const n of NODES) {
      const o = nodes[n.id], near = G.near === n.id; o.oct.rotation.y = t * 0.8; o.oct.rotation.x = t * 0.4;
      let s = near ? 0.72 / 0.55 : 1, hs = near ? 4.2 : 2.6;
      if (n.id === 'choice' && !o.open) { const ph = ((t % G.pulse) + G.pulse) % G.pulse, d = Math.min(ph, G.pulse - ph); const p = Math.exp(-d * d * 60); s *= 1 + p * 0.6; hs *= 1 + p * 0.8; }
      if (n.id === 'source' && G.opened.size < 5) o.mat.color.setHex(COL.nodeDim);
      else o.mat.color.setHex(o.open ? COL.packet : COL.node);
      o.oct.scale.setScalar(s); o.halo.scale.setScalar(hs); o.halo.material.opacity = o.open ? 0.75 : 0.5;
      o.cage.visible = !o.open; o.cage.rotation.y = -t * 0.5; o.cage.rotation.x = t * 0.3;
    }
    for (const id in clues) { const c = clues[id]; if (c.sprite) { c.sprite.material.opacity = (G.clues.has(id) ? 0.55 : 0.75) + Math.sin(t * 3) * 0.2; c.sprite.position.y = c.pos.y + Math.sin(t * 1.3) * 0.25; } }
    sent.visible = G.sentinel.on; if (sent.visible) { sent.position.copy(G.sentinel.pos); sOuter.rotation.set(t * 1.7, t * 2.3, 0); spikes.rotation.set(-t, t * 0.7, t); sInner.scale.setScalar(1 + Math.sin(t * 12) * 0.15); }
    renderer.render(scene, camera);
    frames++; const now = performance.now(); if (now - fpsT > 1000) { fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now;
      // Résolution adaptative : sous 28 img/s, on réduit la définition (jusqu'à 45 %).
      const next = fps < 28 ? Math.max(0.45, resScale * 0.8) : fps > 55 ? Math.min(1, resScale * 1.1) : resScale;
      if (Math.abs(next - resScale) > 0.01) { resScale = next; renderer.setPixelRatio(baseDpr * resScale); resize(); } }
  }
  return { render, resize, setNode: (id, open) => { nodes[id].open = open; }, setClue, clues, get fps() { return fps; }, get resScale() { return resScale; } };
}
