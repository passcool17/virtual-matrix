// Boucle, phases, verrous, pare-feu, sentinelle, score, HUD.
import { Vector3 } from '../vendor/three.module.min.js';
import { CFG, NODES, CLUES, ALERT, alertLevel, BEST_KEY } from './config.js';
import { initAudio, setMuted, sfx } from './audio.js';
import { initMusic, setMood, setMusicMuted, musicState, musicSeekEnd, duckMusic } from './music.js';
import { initVoice, playVoice, stopVoice, setVoiceMuted, voiceState } from './voice.js';
import { startRain } from './rain2d.js';
import { bindInput, bindTouch, readInput, onKey, isTouch, requestLock, releaseLock, pointerLocked } from './input.js';
import { createWorld } from './world.js';
import { LOCKS, PULSE } from './locks.js';

const $ = id => document.getElementById(id), app = $('app'), canvas = $('gl');
const qs = new URLSearchParams(location.search);
let seed = +qs.get('seed') || (Math.random() * 2 ** 31) | 0;
const mulberry = s => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const nodeById = Object.fromEntries(NODES.map((n, i) => [n.id, { ...n, n: i + 1 }]));
const touchMode = isTouch(); app.classList.toggle('touch', touchMode);

const G = { phase: 'boot', t: 0, runT: 0, pos: new Vector3(), vel: new Vector3(), yaw: 0, pitch: 0, trauma: 0, opened: new Set(), order: [], frags: {}, clues: new Set(),
  alert: 0, alertLvl: 0, redMix: 0, denied: 0, near: null, lockId: null, pulse: PULSE, sentinel: { on: false, pos: new Vector3() }, muted: false, endAt: 0, banner: 0, toast: 0, rnd: Math.random };
const world = createWorld(canvas);
let locks = {}, lock = null, denyLines = [];

// ---------- écrans ----------
let stopRain = null;
function setPhase(p) {
  G.phase = p; app.dataset.phase = p; stopRain?.(); stopRain = null;
  const scr = { menu: 'sMenu', blue: 'sBlue', complete: 'sEnd' }[p]; if (scr) stopRain = startRain($(scr).querySelector('.rain2d'), p === 'complete' ? 1.4 : 1);
  if (p !== 'playing') releaseLock();
  if (p === 'menu') $('mBest').textContent = bestText(loadBest());
}
const loadBest = () => { try { const b = JSON.parse(localStorage.getItem(BEST_KEY)); return b && isFinite(b.t) ? b : null; } catch { return null; } };
const bestText = b => (b ? `${fmt(b.t)} · ${b.denied}✕` : '—');

function newRun() {
  G.rnd = mulberry(seed++); G.t = 0; G.runT = 0; G.pos.set(...CFG.start); G.vel.set(0, 0, 0); G.yaw = 0; G.pitch = 0; G.trauma = 0;
  G.opened = new Set(); G.order = []; G.frags = {}; G.clues = new Set(); G.alert = 0; G.alertLvl = 0; G.redMix = 0; G.denied = 0; G.sentinel.on = false; G.endAt = 0;
  locks = {}; for (const n of NODES) { world.setNode(n.id, false); if (n.id !== 'source') locks[n.id] = LOCKS[n.id](lockCtx(n.id)); }
  CLUES.forEach(c => world.setClue(c.id, locks[c.id].clueLines()));
  clearDenied(); closeLock(true); hud(true);
}
function jackIn() { initAudio(); sfx.jack(); newRun(); setPhase('playing'); G.trauma = 0.5; if (!touchMode) requestLock(canvas); }
const resume = () => { initAudio(); setPhase('playing'); if (!touchMode && !lock) requestLock(canvas); };
const pause = () => { if (G.phase !== 'playing') return; closeLock(true); setPhase('paused'); $('pInfo').textContent = `Verrous ouverts ${G.opened.size}/6 · ${fmt(G.runT)} · ${G.denied} DENIED`; };
const mute = () => { G.muted = !G.muted; setMuted(G.muted); setMusicMuted(G.muted); setVoiceMuted(G.muted); $('bMute').textContent = G.muted ? '♪̸' : '♪'; $('bMute').setAttribute('aria-label', G.muted ? 'Activer le son' : 'Couper le son'); $('bSound').firstChild.textContent = G.muted ? 'Son coupé' : 'Son activé'; };

// ---------- verrous ----------
function lockCtx(id) {
  return { t: () => G.t, rnd: () => G.rnd(), sfx, hasClue: c => G.clues.has(c), frags: () => G.order.filter(i => i !== 'source').map(i => ({ n: nodeById[i].n, title: nodeById[i].title, code: G.frags[i] })).sort((a, b) => a.n - b.n),
    deny: msg => { if (!lock || G.lockId !== id) return; $('lkMsg').className = 'lk-msg'; $('lkMsg').textContent = msg; deny(msg); }, grant: () => { if (G.lockId === id) grant(id); },
    flash: msg => { $('lkMsg').className = 'lk-msg'; $('lkMsg').textContent = msg; } };
}
function openLock(id) {
  if (G.phase !== 'playing' || G.opened.has(id) || lock) return false;
  if (id === 'source') { if (G.opened.size < 5) { deny(`${5 - G.opened.size} verrou${G.opened.size < 4 ? 's' : ''} requis`, false); return false; } locks.source = LOCKS.source(lockCtx('source')); }
  lock = locks[id]; G.lockId = id; const n = nodeById[id];
  $('lkTitle').textContent = `VERROU ${String(n.n).padStart(2, '0')} · ${n.title}`; $('lkHelp').textContent = lock.help; $('lkMsg').textContent = ''; const body = document.createElement('div'); body.className = 'lk-body'; $('lkBody').replaceChildren(body); lock.mount(body); // conteneur neuf : les écouteurs d'un verrou précédent ne survivent pas
  $('lkClue').textContent = lock.clueText && G.clues.has(id) ? `◇ Indice capté : ${lock.clueText()}` : '';
  releaseLock(); $('lock').classList.add('on'); G.vel.set(0, 0, 0); sfx.tick(); playVoice(id);
  onKey(e => { if (e.code === 'Escape') { closeLock(); return true; } if (e.code === 'KeyM') return false; lock?.key(e); return true; });
  return true;
}
function closeLock(silent) { stopVoice(); if (!lock && !silent) return; lock = null; G.lockId = null; $('lock').classList.remove('on'); onKey(null); if (!silent && G.phase === 'playing' && !touchMode) requestLock(canvas); }
function deny(msg, raise = true) {
  if (raise) { G.denied++; G.alert = Math.min(ALERT.max, G.alert + ALERT.perDeny); }
  sfx.deny(); G.trauma = Math.min(1, G.trauma + 0.3);
  const el = document.createElement('div'); el.className = 'deny'; el.textContent = 'ACCESS DENIED'; const s = document.createElement('small'); s.textContent = msg; el.append(s);
  el.style.transform = `translateX(${(G.rnd() - 0.5) * 18}vw) rotate(${(G.rnd() - 0.5) * 8}deg)`;
  $('denied').append(el); denyLines.push({ el, until: G.t + 6 }); while (denyLines.length > 14) denyLines.shift().el.remove();
}
const clearDenied = () => { denyLines.forEach(d => d.el.remove()); denyLines = []; };
function grant(id) {
  if (G.opened.has(id) || G.phase !== 'playing') return; // un verrou ne s'ouvre qu'une fois (double tap, événement en retard)
  const n = nodeById[id]; closeLock(); G.opened.add(id); G.order.push(id); world.setNode(id, true);
  G.frags[id] = id === 'source' ? '∞' : fragCode();
  G.alert = Math.max(0, G.alert - ALERT.perGrant); clearDenied(); G.trauma = 0.65; sfx.granted(); sfx.decode();
  $('grTitle').textContent = n.title; const gr = $('granted'); gr.classList.remove('on'); void gr.offsetWidth; gr.classList.add('on');
  $('hBanner').innerHTML = ''; const b = document.createElement('b'); b.textContent = id === 'source' ? 'SOURCE · OUVERTE' : `${n.title} · FRAGMENT ${G.frags[id]}`; const p = document.createElement('p'); p.textContent = `« ${n.phrase} »`; $('hBanner').append(b, p); G.banner = G.t + 6;
  if (id === 'source') { G.endAt = G.t + 2.2; sfx.complete(); }
  hud(true);
}
function fragCode() { for (;;) { const c = (G.rnd() * 256 | 0).toString(16).toUpperCase().padStart(2, '0'); if (!Object.values(G.frags).includes(c)) return c; } }
function relockLast() {
  const id = G.order.filter(i => i !== 'source').pop(); if (!id) return null;
  G.order = G.order.filter(i => i !== id); G.opened.delete(id); delete G.frags[id]; world.setNode(id, false);
  locks[id] = LOCKS[id](lockCtx(id)); const c = CLUES.find(c => c.id === id); if (c) { G.clues.delete(id); world.setClue(id, locks[id].clueLines()); }
  return id;
}
function toast(txt) { $('toast').textContent = txt; $('toast').classList.add('on'); G.toast = G.t + 3; }

function complete() {
  const best = loadBest(), score = { t: Math.round(G.runT * 10) / 10, denied: G.denied }, isRec = !best || score.t + 5 * score.denied < best.t + 5 * best.denied;
  if (isRec) try { localStorage.setItem(BEST_KEY, JSON.stringify(score)); } catch {}
  $('eTime').textContent = fmt(score.t); $('eDenied').textContent = score.denied; $('eBest').textContent = bestText(isRec ? score : best); $('eRecord').classList.toggle('on', isRec);
  $('eFrags').replaceChildren(...NODES.filter(n => n.id !== 'source').map(n => { const li = document.createElement('li'); li.innerHTML = `${n.title} <b></b>`; li.querySelector('b').textContent = G.frags[n.id] || '··'; return li; }));
  setPhase('complete');
}

// ---------- boucle ----------
const fwd = new Vector3(), right = new Vector3(), tmp = new Vector3();
function wrapDelta(a, b) { tmp.subVectors(b, a); for (const k of ['x', 'z']) { if (tmp[k] > CFG.wrap) tmp[k] -= 2 * CFG.wrap; if (tmp[k] < -CFG.wrap) tmp[k] += 2 * CFG.wrap; } return tmp; }
function step(dt) {
  const I = readInput();
  if (I.mute) mute();
  if (I.pause) { pause(); return; }
  G.t += dt; G.runT += dt;
  if (!lock) {
    G.yaw -= I.lx * CFG.lookSens; G.pitch = Math.max(-1.45, Math.min(1.45, G.pitch - I.ly * CFG.lookSens));
    const cp = Math.cos(G.pitch); fwd.set(-Math.sin(G.yaw) * cp, Math.sin(G.pitch), -Math.cos(G.yaw) * cp); right.set(Math.cos(G.yaw), 0, -Math.sin(G.yaw));
    tmp.set(0, 0, 0).addScaledVector(fwd, I.my).addScaledVector(right, I.mx); tmp.y += I.rise; if (tmp.lengthSq() > 1) tmp.normalize();
    tmp.multiplyScalar(CFG.flySpeed * (I.boost ? CFG.boostMul : 1)); G.vel.lerp(tmp, 1 - Math.exp(-8 * dt));
    G.pos.addScaledVector(G.vel, dt);
  } else G.vel.set(0, 0, 0);
  for (const k of ['x', 'z']) { if (G.pos[k] > CFG.wrap) G.pos[k] -= 2 * CFG.wrap; if (G.pos[k] < -CFG.wrap) G.pos[k] += 2 * CFG.wrap; }
  G.pos.y = Math.max(CFG.yMin, Math.min(CFG.yMax, G.pos.y));
  // nœud proche
  let best = null, bd = Infinity; for (const n of NODES) { const d = wrapDelta(G.pos, tmp.set(n.x, n.y, n.z).clone()).length(); if (d < bd) { bd = d; best = n; } }
  G.nearDist = bd; G.nearest = best; G.near = bd <= CFG.hackRange ? best.id : null;
  if (I.hack && G.near && !lock) openLock(G.near);
  // indices
  for (const c of CLUES) if (!G.clues.has(c.id) && G.pos.distanceTo(world.clues[c.id].pos) < CFG.clueRange) { G.clues.add(c.id); sfx.tick(); toast(`◇ INDICE CAPTÉ · ${nodeById[c.id].title} · ${locks[c.id].clueText()}`); if (G.lockId === c.id) $('lkClue').textContent = `◇ Indice capté : ${lock.clueText()}`; hud(true); }
  // pare-feu
  G.alert = Math.max(0, G.alert - ALERT.decay * dt); G.alertLvl = alertLevel(G.alert); G.redMix += ((G.alertLvl >= 1 ? 1 : 0) - G.redMix) * Math.min(1, dt * 2);
  const S = G.sentinel;
  if (G.alertLvl >= 3 && !S.on && !G.endAt) { const a = G.rnd() * Math.PI * 2; S.pos.set(G.pos.x + Math.cos(a) * 30, Math.max(3, Math.min(30, G.pos.y + 4)), G.pos.z + Math.sin(a) * 30); S.on = true; toast('⚠ SENTINELLE DÉPLOYÉE'); sfx.deny(); }
  if (S.on) {
    if (G.alertLvl < 2) S.on = false;
    const d = wrapDelta(S.pos, G.pos), L = d.length();
    if (L < ALERT.hit) {
      const id = relockLast(); d.normalize(); G.pos.addScaledVector(d.y === 0 && d.x === 0 ? fwd : d, ALERT.push); G.pos.y = Math.max(CFG.yMin, Math.min(CFG.yMax, G.pos.y)); G.vel.set(0, 0, 0);
      closeLock(true); G.alert = 4; S.on = false; G.trauma = 1; sfx.deny();
      toast(id ? `⚠ FRAGMENT VOLÉ · ${nodeById[id].title} refermé` : '⚠ SENTINELLE · repoussé'); hud(true);
    } else S.pos.addScaledVector(d.normalize(), ALERT.sentinelSpeed * (lock ? 0.35 : 1) * dt);
    for (const k of ['x', 'z']) { if (S.pos[k] > CFG.wrap) S.pos[k] -= 2 * CFG.wrap; if (S.pos[k] < -CFG.wrap) S.pos[k] += 2 * CFG.wrap; }
  }
  G.trauma = Math.max(0, G.trauma - 1.8 * dt);
  lock?.update(G.t);
  denyLines = denyLines.filter(d => (d.until > G.t ? true : (d.el.remove(), false)));
  if (G.banner && G.t > G.banner) { $('hBanner').classList.remove('on'); G.banner = 0; } else if (G.banner) $('hBanner').classList.add('on');
  if (G.toast && G.t > G.toast) { $('toast').classList.remove('on'); G.toast = 0; }
  if (G.endAt && G.t >= G.endAt) { G.endAt = 0; complete(); }
}

let hudT = 0;
function hud(force) {
  if (!force && G.t - hudT < 0.1) return; hudT = G.t;
  $('hCoords').textContent = `X ${G.pos.x.toFixed(0)} Y ${G.pos.y.toFixed(0)} Z ${G.pos.z.toFixed(0)}`;
  $('hNodes').textContent = `${G.opened.size}/6`; $('hTime').textContent = `${fmt(G.runT)} · ${G.denied}✕`;
  const al = $('hAlert'); al.dataset.l = G.alertLvl; $('hAlertTxt').textContent = ['calme', 'trace', 'traque', 'SENTINELLE'][G.alertLvl]; app.classList.toggle('danger-hud', G.alertLvl >= 1);
  const fr = $('hFrags'); fr.replaceChildren(...NODES.filter(n => G.frags[n.id] && n.id !== 'source').map(n => { const s = document.createElement('span'); s.innerHTML = `${String(nodeById[n.id].n).padStart(2, '0')} ${n.title} · <b></b>`; s.querySelector('b').textContent = G.frags[n.id]; return s; }),
    ...[...G.clues].map(id => { const s = document.createElement('span'); s.className = 'clue'; s.textContent = `◇ ${nodeById[id].title} · ${locks[id].clueText()}`; return s; }));
  const P = $('hPrompt'), n = G.near && nodeById[G.near];
  if (lock) P.innerHTML = '';
  else if (n) { const srcLocked = n.id === 'source' && G.opened.size < 5 && !G.opened.has('source');
    P.innerHTML = G.opened.has(n.id) ? `${n.title} · ouvert` : srcLocked ? `${n.title} · ${5 - G.opened.size} verrou(s) requis` : `VERROU ${n.title}<small>${touchMode ? 'Appuie DÉCODER' : 'Appuie E — crocheter'} · ${G.nearDist.toFixed(1)} m</small>`; }
  else { const t = NODES.map(x => ({ x, d: wrapDelta(G.pos, new Vector3(x.x, x.y, x.z)).length() })).filter(o => !G.opened.has(o.x.id)).sort((a, b) => a.d - b.d)[0]; P.innerHTML = t ? `<small>SIGNAL ${t.x.title} · ${t.d.toFixed(0)} m</small>` : ''; }
  $('tHack').classList.toggle('ready', !!G.near && !G.opened.has(G.near));
  app.classList.toggle('locked', pointerLocked());
  if (!touchMode) radar();
}
const rc = $('radar').getContext('2d');
function radar() {
  const W = 132, c = W / 2, sc = c / 40; rc.clearRect(0, 0, W, W); rc.strokeStyle = '#1c3a26'; rc.beginPath(); rc.arc(c, c, c * 0.5, 0, 7); rc.moveTo(c, 4); rc.lineTo(c, W - 4); rc.moveTo(4, c); rc.lineTo(W - 4, c); rc.stroke();
  const cs = Math.cos(G.yaw), sn = Math.sin(G.yaw);
  const plot = (p, col, r) => { const d = wrapDelta(G.pos, p), x = d.x * cs - d.z * sn, z = d.x * sn + d.z * cs, l = Math.hypot(x, z), k = l * sc > c - 6 ? (c - 6) / (l * sc) : 1; rc.fillStyle = col; rc.beginPath(); rc.arc(c + x * sc * k, c + z * sc * k, r, 0, 7); rc.fill(); };
  for (const n of NODES) plot(new Vector3(n.x, n.y, n.z), G.opened.has(n.id) ? '#9dffc0' : n.id === 'source' && G.opened.size < 5 ? '#3d5c44' : '#ff8a80', G.near === n.id ? 5 : 3.5);
  for (const cl of CLUES) if (!G.clues.has(cl.id)) plot(world.clues[cl.id].pos, '#c8ffd4', 2);
  if (G.sentinel.on) plot(G.sentinel.pos, '#ff3b30', 5);
  rc.fillStyle = '#5dff8a'; rc.beginPath(); rc.moveTo(c, c - 6); rc.lineTo(c - 4, c + 4); rc.lineTo(c + 4, c + 4); rc.fill();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  if (G.phase === 'playing') { step(dt); hud(); }
  if (G.phase !== 'paused') setMood(G.phase !== 'playing' ? 'menu' : G.lockId === 'source' ? 'source' : G.alertLvl >= 2 ? 'alert' : 'calm');
  if (G.phase === 'playing' || G.phase === 'paused') { $('flash').style.opacity = (G.trauma * G.trauma * 0.42).toFixed(3); world.render(G, G.phase === 'playing' ? dt : 0); }
  requestAnimationFrame(frame);
}

// ---------- liaisons ----------
bindInput(canvas, { onLockLost: () => { if (G.phase === 'playing' && !lock) pause(); }, canLock: () => G.phase === 'playing' && !lock });
bindTouch($('joy'), $('knob'), $('tUp'), $('tDown'), $('tHack'));
$('bRed').onclick = jackIn; $('bBlue').onclick = () => { initAudio(); setPhase('blue'); };
$('bReconsider').onclick = jackIn; $('bIdle').onclick = () => setPhase('menu');
$('bPause').onclick = pause; $('bMute').onclick = () => { initAudio(); mute(); };
$('bResume').onclick = resume; $('bSound').onclick = mute; $('bQuit').onclick = () => setPhase('menu');
$('bAgain').onclick = jackIn; $('bMenu').onclick = () => setPhase('menu');
$('lkClose').onclick = () => closeLock();
$('lkVoice').onclick = () => { if (G.lockId) playVoice(G.lockId); };
addEventListener('keydown', e => { if (G.phase === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) { e.preventDefault(); resume(); } });

// Accroches de test (?qa=1 démarre directement).
window.__vm = { G, world, music: musicState, voice: voiceState, musicSeekEnd, get lock() { return lock; }, locks: () => locks, jack: jackIn, open: openLock, close: () => closeLock(),
  solve: id => { if (!lock || G.lockId !== id) { if (!G.opened.has(id) && id === 'source') for (const n of NODES) if (n.id !== 'source' && !G.opened.has(n.id)) grant(n.id); openLock(id); } if (G.lockId === id) grant(id); return G.opened.has(id); },
  tp: id => { const n = nodeById[id]; G.pos.set(n.x, n.y, n.z + 2.5); G.yaw = 0; G.pitch = 0; G.vel.set(0, 0, 0); },
  tpClue: id => { G.pos.copy(world.clues[id].pos).add(new Vector3(0, 0, 3)); G.yaw = 0; G.pitch = 0; },
  setAlert: v => { G.alert = v; G.alertLvl = alertLevel(v); }, secret: id => locks[id]?.secret(), fps: () => world.fps, waitT: s => new Promise(r => { const end = G.t + s; const f = () => (G.t >= end ? r(G.t) : requestAnimationFrame(f)); f(); }) };
initMusic();
initVoice(on => { duckMusic(on); $('lkVoice').classList.toggle('on', on); });
setPhase('menu');
requestAnimationFrame(frame);
if (qs.get('qa') === '1') jackIn();
