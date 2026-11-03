// Entrées : clavier (event.code), souris (pointer lock), manette, tactile.
export const keys = new Set();
const look = { x: 0, y: 0 }, touch = { jx: 0, jy: 0, rise: 0 };
let pulses = { hack: false, pause: false, mute: false }, keyHook = null, lockWanted = false, gpPrev = [];
export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;
export const onKey = fn => { keyHook = fn; };
export const pressHack = () => { pulses.hack = true; };
const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function bindInput(canvas, { onLockLost, canLock }) {
  addEventListener('keydown', e => {
    if (e.target?.tagName === 'INPUT') return;
    if (BLOCK.has(e.code)) e.preventDefault();
    if (keyHook && keyHook(e) === true) return; // le verrou ouvert a consommé la touche
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'NumpadEnter') pulses.hack = true;
    if (e.code === 'Escape' || e.code === 'KeyP') pulses.pause = true;
    if (e.code === 'KeyM') pulses.mute = true;
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('click', () => { if (!isTouch() && canLock()) requestLock(canvas); });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && lockWanted) { lockWanted = false; onLockLost(); } });
  addEventListener('mousemove', e => { if (document.pointerLockElement) { look.x += e.movementX; look.y += e.movementY; } });
  // Regard tactile : glisser sur la moitié droite.
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; if (e.clientX > innerWidth * 0.46) { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { look.x += (e.clientX - drag.x) * 1.6; look.y += (e.clientY - drag.y) * 1.6; drag.x = e.clientX; drag.y = e.clientY; } });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}
export function requestLock(el) { try { lockWanted = true; const p = el.requestPointerLock?.(); p?.catch?.(() => { lockWanted = false; }); } catch { lockWanted = false; } }
export function releaseLock() { lockWanted = false; if (document.pointerLockElement) document.exitPointerLock(); }
export const pointerLocked = () => !!document.pointerLockElement;

export function bindTouch(joy, knob, up, down, hackBtn) {
  const R = 54; let id = null, cx = 0, cy = 0;
  joy.addEventListener('pointerdown', e => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.setPointerCapture(e.pointerId); mv(e); e.preventDefault(); });
  const mv = e => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } touch.jx = dx / R; touch.jy = -dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener('pointermove', mv);
  const stop = e => { if (e.pointerId !== id) return; id = null; touch.jx = touch.jy = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', stop); joy.addEventListener('pointercancel', stop);
  const hold = (b, v) => { b.addEventListener('pointerdown', e => { touch.rise = v; e.preventDefault(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, () => { if (touch.rise === v) touch.rise = 0; })); };
  hold(up, 1); hold(down, -1);
  hackBtn.addEventListener('pointerdown', e => { pulses.hack = true; e.preventDefault(); });
}

export function readInput() {
  const k = c => keys.has(c);
  let mx = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
  let my = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  let rise = (k('Space') || k('KeyQ') ? 1 : 0) - (k('ControlLeft') || k('ControlRight') || k('KeyC') ? 1 : 0);
  let boost = k('ShiftLeft') || k('ShiftRight');
  let lx = look.x, ly = look.y; look.x = look.y = 0;
  mx += touch.jx; my += touch.jy; rise += touch.rise;
  const out = { hack: pulses.hack, pause: pulses.pause, mute: pulses.mute };
  pulses = { hack: false, pause: false, mute: false };
  const gp = navigator.getGamepads?.()?.find(g => g && g.connected);
  if (gp) {
    const dz = v => (Math.abs(v) < 0.15 ? 0 : v), b = i => !!gp.buttons[i]?.pressed, ax = gp.axes;
    mx += dz(ax[0] || 0); my -= dz(ax[1] || 0); lx += dz(ax[2] || 0) * 14; ly += dz(ax[3] || 0) * 14;
    rise += (gp.buttons[7]?.value || 0) - (gp.buttons[6]?.value || 0); boost ||= b(10) || b(4);
    if (b(0) && !gpPrev[0]) out.hack = true; if (b(9) && !gpPrev[9]) out.pause = true;
    gpPrev = gp.buttons.map(x => x.pressed);
  }
  const clamp = v => Math.max(-1, Math.min(1, v));
  return { mx: clamp(mx), my: clamp(my), rise: clamp(rise), boost, lx, ly, ...out };
}
