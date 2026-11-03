// Consignes vocales de la machine : un seul <audio> réutilisé, « déverrouillé » au 1er geste (iOS),
// joué à l'ouverture d'un verrou, coupé à la fermeture. La musique baisse pendant la voix.
const FILES = { spoon: '01_cuillere', rabbit: '02_lapin', desert: '03_desert', choice: '04_choix', sleep: '05_sommeil', source: '06_source' };
const url = id => `voice/machine_puzzle_${FILES[id]}.mp3`;
const SILENCE = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='; // 10 ms muets : sert au déblocage iOS sans télécharger de consigne
const a = new Audio();
let muted = false, primed = false, cur = null, onChange = () => {};
a.preload = 'none';
const done = () => { cur = null; onChange(false); };
a.addEventListener('ended', done);
a.addEventListener('error', () => { if (cur) { a.dataset.err = cur; done(); } });

// Le 1er geste joue l'élément en sourdine puis le met en pause : iOS autorise ensuite play() hors geste.
function prime() {
  if (primed) return; primed = true;
  if (cur) return; // une vraie consigne joue déjà
  a.muted = true; a.src = SILENCE;
  a.play().then(() => { if (!cur) { a.pause(); a.currentTime = 0; } }, () => { primed = false; });
}
export function initVoice(change) {
  onChange = change;
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, prime, { capture: true, passive: true });
}
export function playVoice(id) {
  if (!FILES[id] || muted) return;
  cur = id; delete a.dataset.err; a.muted = false; a.src = url(id); a.currentTime = 0; onChange(true);
  a.play().catch(e => { if (cur === id && e.name !== 'AbortError') done(); });
}
export function stopVoice() { if (!cur) return; a.pause(); done(); }
export function setVoiceMuted(m) { muted = m; if (m) stopVoice(); }
export const voiceState = () => ({ id: cur, src: a.src.split('/').pop() || null, playing: !!cur && !a.paused, time: a.currentTime, err: a.dataset.err || null });
