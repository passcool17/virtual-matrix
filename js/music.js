// Musique d'ambiance (pistes de Pascal) : deux lecteurs <audio> en streaming, fondu enchaîné.
// Une piste par étape, dans l'ordre voulu par Pascal (1:53 → 2:05 → 2:13 → 2:16) :
// menu → vol calme → pare-feu niv. ≥ 2 → verrou final SOURCE. Chaque piste boucle en fondu.
const LISTS = { menu: ['music/escape-1.mp3'], calm: ['music/theme-1.mp3'], alert: ['music/escape-2.mp3'], source: ['music/theme-2.mp3'] };
const VOL = 0.55, FADE = 2.5, TAIL = 2.5, CALM_AFTER = 4; // s
const idx = { menu: 0, calm: 0, alert: 0, source: 0 };
let duck = 1, duckTo = 1, decks = [], cur = -1, mood = 'menu', want = 'menu', unlocked = false, muted = false, calmSince = 0, fading = null;

function deck() { const a = new Audio(); a.preload = 'none'; a.crossOrigin = 'anonymous'; a.volume = 0; a.addEventListener('error', () => { a.dataset.err = '1'; }); return a; }
function start(m) {
  const a = decks[cur = cur < 0 ? 0 : 1 - cur], b = decks[1 - cur], list = LISTS[m];
  mood = m; a.src = list[idx[m] % list.length]; idx[m]++; a.dataset.mood = m; a.preload = 'auto'; a.currentTime = 0; a.volume = 0; a.muted = muted;
  a.play().catch(() => { unlocked = false; }); // relancé au prochain geste
  fading = { in: a, out: b.src && !b.paused ? b : null, v0: b.volume, t0: performance.now() };
}
function tick() {
  requestAnimationFrame(tick);
  if (!unlocked) return;
  const now = performance.now() / 1000;
  duck += (duckTo - duck) * 0.12; // baisse/remontée douce (~0,4 s) sous la voix
  if (want !== mood) { if (!(mood === 'alert' && want === 'calm') || now - calmSince > CALM_AFTER) start(want); } // hystérésis : l'alerte retombe avant le retour au calme
  const a = decks[cur];
  if (a && !fading && a.duration && a.duration - a.currentTime < TAIL) start(mood); // piste suivante de la liste
  if (fading) {
    const k = Math.min(1, (performance.now() - fading.t0) / (FADE * 1000));
    fading.in.volume = VOL * duck * k; if (fading.out) fading.out.volume = fading.v0 * (1 - k);
    if (k >= 1) { if (fading.out) { fading.out.pause(); fading.out.preload = 'none'; } fading = null; }
  } else if (a) a.volume = VOL * duck;
}
function unlock() {
  if (unlocked) return; unlocked = true;
  const a = decks[cur];
  if (a?.src && a.paused) a.play().catch(() => { unlocked = false; }); else if (!a?.src) start(want);
}
export function initMusic() {
  decks = [deck(), deck()];
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { capture: true, passive: true });
  requestAnimationFrame(tick);
}
export function setMood(m) { if (m !== want) { want = m; if (m === 'calm') calmSince = performance.now() / 1000; } }
export function duckMusic(on) { duckTo = on ? 0.35 : 1; }
export function setMusicMuted(m) { muted = m; decks.forEach(d => { d.muted = m; }); }
export const musicSeekEnd = () => { const a = decks[cur]; if (a?.duration) a.currentTime = a.duration - TAIL - 0.5; }; // test
export const musicState = () => { const a = decks[cur]; return { unlocked, mood, want, muted, src: a?.src.split('/').pop() || null, playing: !!a && !a.paused, time: a ? a.currentTime : 0, vol: a ? a.volume : 0, duck, other: decks[1 - cur] ? { src: decks[1 - cur].src.split('/').pop(), playing: !decks[1 - cur].paused, vol: decks[1 - cur].volume } : null, err: decks.some(d => d.dataset.err) }; };
