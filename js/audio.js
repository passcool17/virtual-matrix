// Sons synthétisés (WebAudio) : nappe + effets. Rien à télécharger.
let ac = null, master, amb, fx, started = false, muted = false;
const gain = (to, v) => { const g = ac.createGain(); g.gain.value = v; g.connect(to); return g; };
function drone() {
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 0.7; lp.connect(amb);
  [55, 82.4, 110].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = i ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.value = i === 2 ? 0.07 : 0.11; o.connect(g); g.connect(lp); o.start(); });
  const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = ac.createBufferSource(); n.buffer = b; n.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.6; n.connect(bp); bp.connect(gain(amb, 0.035)); n.start();
}
export function initAudio() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C({ latencyHint: 'interactive' }); master = gain(ac.destination, muted ? 0 : 0.72); amb = gain(master, 0.22); fx = gain(master, 0.55); }
  if (ac.state === 'suspended') ac.resume();
  if (!started) { started = true; drone(); }
}
export function setMuted(m) { muted = m; if (ac) master.gain.setTargetAtTime(m ? 0 : 0.72, ac.currentTime, 0.04); }
function tone(f, dur, type, vol, slide = 0, delay = 0) {
  if (!ac) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + dur);
  g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(1e-4, t + dur); o.connect(g); g.connect(fx); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  jack: () => { tone(55, 0.5, 'sine', 0.2, 110); tone(440, 0.25, 'triangle', 0.08, 880); },
  decode: () => { tone(220, 0.18, 'sawtooth', 0.22, 420); tone(880, 0.12, 'square', 0.08, -200); },
  deny: () => { tone(90, 0.14, 'square', 0.12, -30); tone(70, 0.22, 'sawtooth', 0.08, -20, 0.08); },
  complete: () => { tone(220, 0.4, 'triangle', 0.18, 220); tone(330, 0.55, 'sine', 0.14, 330); tone(495, 0.7, 'sine', 0.1, 200); },
  key: () => tone(1200, 0.04, 'square', 0.04),
  tick: () => tone(660, 0.06, 'triangle', 0.06),
  granted: () => { tone(440, 0.2, 'square', 0.08); tone(660, 0.3, 'triangle', 0.12, 0, 0.1); tone(990, 0.5, 'sine', 0.12, 0, 0.22); },
  pad: i => tone([330, 392, 494, 587][i] || 440, 0.22, 'triangle', 0.14),
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ac?.state === 'suspended') ac.resume(); });
