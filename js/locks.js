// Les six verrous. Chaque fabrique reçoit ctx = { t(), deny(msg, opts), grant(), sfx, hasClue(id), frags(), rnd }
// et renvoie { help, mount(body), key(e) → bool, update(t), solve(), secret }.
const h = (tag, cls, txt, attrs = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const btn = (txt, act, cls = '') => h('button', 'lk-btn ' + cls, txt, { type: 'button', 'data-act': act });
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const isEnter = c => c === 'Enter' || c === 'NumpadEnter';
const digitOf = c => (/^(Digit|Numpad)(\d)$/.exec(c) || [])[2];
export const PULSE = 1.1, WINDOW = 0.12; // fenêtre de frappe CHOIX (était ±0,14 s)

function spoon(ctx) {
  const secret = shuffle([1, 2, 3, 4, 5, 6], ctx.rnd).slice(0, 4); let entry = [];
  const hintPos = ctx.rnd() * 4 | 0; const hist = [];
  let slots, log, body;
  const draw = () => { slots.forEach((s, i) => { s.textContent = entry[i] ?? '·'; }); log.replaceChildren(...hist.slice(-5).map(x => { // les chiffres bien placés s'allument à leur position ; les mal placés restent un simple compte
    const li = h('li'); li.append(...x.g.map((d, i) => h('b', d === secret[i] ? 'lk-d hit' : 'lk-d', String(d))), `  →  ${x.b} bien placé${x.b > 1 ? 's' : ''} · ${x.m} mal placé${x.m > 1 ? 's' : ''}`); return li; })); };
  const push = d => { if (entry.length < 4) { entry.push(d); ctx.sfx.key(); draw(); } };
  const submit = () => {
    if (entry.length < 4) { ctx.flash('4 chiffres requis'); return; }
    const b = entry.filter((d, i) => d === secret[i]).length, m = entry.filter(d => secret.includes(d)).length - b;
    if (b === 4) { ctx.grant(); return; }
    hist.push({ g: entry, b, m }); entry = []; draw(); ctx.deny(`${b} bien placé${b > 1 ? 's' : ''} · ${m} mal placé${m > 1 ? 's' : ''}`);
  };
  const act = a => { if (a === 'del') { entry.pop(); draw(); } else if (a === 'ok') submit(); else push(+a); };
  return {
    help: 'Code à 4 chiffres distincts (1 à 6). Après chaque essai, les chiffres bien placés s’allument en vert ; les mal placés sont seulement comptés.',
    clueText: () => `chiffre ${hintPos + 1} = ${secret[hintPos]}`, clueLines: () => ['CUILLÈRE', `chiffre ${hintPos + 1} = ${secret[hintPos]}`],
    mount(el) { body = el; slots = [0, 1, 2, 3].map(() => h('span', 'lk-slot', '·')); const pad = h('div', 'lk-pad');
      [1, 2, 3, 4, 5, 6].forEach(d => pad.append(btn(String(d), String(d)))); pad.append(btn('⌫', 'del', 'alt'), btn('OK', 'ok', 'go'));
      log = h('ol', 'lk-log'); el.append(h('div', 'lk-slots', null), pad, log); el.firstChild.append(...slots);
      pad.addEventListener('click', e => { const a = e.target.closest('[data-act]')?.dataset.act; if (a) act(a); }); draw(); },
    key(e) { const d = digitOf(e.code); if (d) { if (d >= 1 && d <= 6) push(+d); return true; } if (e.code === 'Backspace') { act('del'); return true; } if (isEnter(e.code)) { submit(); return true; } return false; },
    update() {}, secret: () => secret.join(''),
  };
}

function rabbit(ctx) {
  const SY = ['◆', '●', '▲', '■'], seq = Array.from({ length: 5 }, () => ctx.rnd() * 4 | 0); const LENS = [3, 4, 5], STEP = 0.6, LIT = 0.45; // clignotement plus vif (était 0,7 s / 0,55 s)
  let round = 0, pos = 0, phase = 'wait', t0 = null, pads, info;
  const start = () => { phase = 'show'; t0 = null; pos = 0; };
  const press = i => { if (phase !== 'input') return; flashPad(i, ctx.t()); ctx.sfx.pad(i);
    if (seq[pos] !== i) { ctx.deny('séquence rompue'); phase = 'wait'; t0 = ctx.t(); return; }
    if (++pos >= LENS[round]) { if (++round >= 3) { ctx.grant(); phase = 'done'; } else { phase = 'wait'; t0 = ctx.t(); } } draw(); };
  let lit = [-1, 0];
  const flashPad = (i, t) => { lit = [i, t]; };
  const draw = () => { if (info) info.textContent = phase === 'show' ? `Ronde ${round + 1}/3 · observe…` : phase === 'input' ? `Ronde ${round + 1}/3 · à toi (${pos}/${LENS[round]})` : phase === 'done' ? 'Séquence acceptée' : `Ronde ${round + 1}/3`; };
  return {
    help: 'Observe les symboles qui clignotent, puis répète la séquence. Trois rondes : 3, 4 puis 5 symboles.',
    mount(el) { info = h('p', 'lk-info'); const g = h('div', 'lk-pads'); pads = SY.map((s, i) => { const b = btn(s, String(i), 'pad'); b.append(h('small', null, String(i + 1))); g.append(b); return b; });
      g.addEventListener('click', e => { const a = e.target.closest('[data-act]')?.dataset.act; if (a != null) press(+a); }); el.append(info, g); phase = 'wait'; t0 = null; draw(); },
    key(e) { const d = digitOf(e.code); if (d >= 1 && d <= 4) { press(d - 1); return true; } return false; },
    update(t) {
      if (phase === 'wait') { if (t0 == null) t0 = t; if (t - t0 > 0.7) { start(); draw(); } }
      else if (phase === 'show') { if (t0 == null) t0 = t; const k = (t - t0) / STEP | 0, f = (t - t0) % STEP;
        if (k >= LENS[round]) { phase = 'input'; pos = 0; lit = [-1, 0]; draw(); }
        else if (f < LIT) { if (lit[0] !== seq[k] || lit[1] !== t0 + k * STEP) { lit = [seq[k], t0 + k * STEP]; ctx.sfx.pad(seq[k]); } } else lit = [-1, 0]; }
      pads?.forEach((p, i) => p.classList.toggle('lit', phase === 'show' ? lit[0] === i : lit[0] === i && t - lit[1] < 0.18));
    },
    secret: () => ({ round, phase, seq: seq.slice(0, LENS[round]) }),
  };
}

function desert(ctx) {
  const G8 = ['ｱ', 'Σ', 'ﾂ', 'Ω', 'λ', 'ﾈ', 'Δ', 'ﾐ'], target = G8[ctx.rnd() * 8 | 0];
  const rings = [0, 1, 2].map(() => shuffle(G8.slice(), ctx.rnd));
  const off = [0, 0, 0]; let sel = 0, rows;
  const at = (r, k = 0) => rings[r][(((off[r] + k) % 8) + 8) % 8];
  const aligned = () => [0, 1, 2].every(r => at(r) === target);
  const turn = (r, d) => { for (let i = r; i <= Math.min(2, r + 1); i++) off[i] += d; ctx.sfx.tick(); draw(); };
  do { for (let r = 0; r < 3; r++) off[r] = ctx.rnd() * 8 | 0; } while (aligned());
  const draw = () => rows?.forEach((row, r) => { row.classList.toggle('sel', r === sel); row.querySelectorAll('.g').forEach((g, k) => { g.textContent = at(r, k - 1); g.classList.toggle('mid', k === 1); }); });
  const validate = () => (aligned() ? ctx.grant() : ctx.deny('glyphes désalignés'));
  return {
    help: `Aligne le glyphe ${target} au centre des trois anneaux. Attention : un anneau entraîne aussi celui du dessous.`,
    mount(el) { el.append(h('p', 'lk-target', `CIBLE  ${target}`)); const box = h('div', 'lk-rings');
      rows = [0, 1, 2].map(r => { const row = h('div', 'lk-ring'); row.append(btn('◀', `L${r}`, 'alt')); const w = h('div', 'lk-win'); for (let k = 0; k < 3; k++) w.append(h('span', 'g')); /* 3 glyphes visibles (était 5) */ row.append(w, btn('▶', `R${r}`, 'alt')); box.append(row); return row; });
      const ok = btn('VALIDER', 'ok', 'go wide'); el.append(box, ok);
      el.addEventListener('click', e => { const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return; if (a === 'ok') validate(); else { sel = +a[1]; turn(sel, a[0] === 'L' ? 1 : -1); } }); draw(); },
    key(e) { const c = e.code;
      if (c === 'ArrowUp' || c === 'KeyW') { sel = (sel + 2) % 3; draw(); return true; } if (c === 'ArrowDown' || c === 'KeyS') { sel = (sel + 1) % 3; draw(); return true; }
      if (c === 'ArrowLeft' || c === 'KeyA') { turn(sel, 1); return true; } if (c === 'ArrowRight' || c === 'KeyD') { turn(sel, -1); return true; }
      if (isEnter(c) || c === 'Space') { validate(); return true; } return false; },
    update() {},
    // Suite de clics ◀ (L) qui résout : on aligne l'anneau 0, puis 1, puis 2.
    secret: () => { const o = off.slice(), steps = []; for (let r = 0; r < 3; r++) { let n = 0; while (rings[r][((o[r] % 8) + 8) % 8] !== target) { for (let i = r; i <= Math.min(2, r + 1); i++) o[i]++; n++; } steps.push(n); } return { target, steps }; },
  };
}

function choice(ctx) {
  let hits = 0, lastPulse = -1, ring, dots, info;
  const press = () => { const t = ctx.t(), k = Math.round(t / PULSE), d = Math.abs(t - k * PULSE);
    if (d <= WINDOW && k !== lastPulse) { lastPulse = k; hits++; ctx.sfx.tick(); draw(); if (hits >= 3) ctx.grant(); }
    else { hits = 0; lastPulse = k; draw(); ctx.deny(d <= WINDOW ? 'double frappe' : 'hors rythme'); } };
  const draw = () => dots?.forEach((d, i) => d.classList.toggle('on', i < hits));
  return {
    help: 'Le nœud bat. Frappe quand le cercle touche le cadre — trois fois de suite, sans rater.',
    mount(el) { const stage = h('div', 'lk-pulse'); ring = h('div', 'ring'); stage.append(h('div', 'frame'), ring); dots = [0, 1, 2].map(() => h('span', 'dot')); const row = h('div', 'lk-dots'); row.append(...dots);
      const b = btn('FRAPPE', 'hit', 'go wide'); b.addEventListener('pointerdown', e => { e.preventDefault(); press(); }); el.append(stage, row, b); draw(); },
    key(e) { if (e.code === 'Space' || e.code === 'KeyE' || isEnter(e.code)) { if (!e.repeat) press(); return true; } return false; },
    update(t) { if (!ring) return; const ph = ((t % PULSE) + PULSE) % PULSE, d = Math.min(ph, PULSE - ph); ring.style.transform = `scale(${0.25 + 0.75 * (1 - Math.min(1, d / (PULSE / 2)))})`; ring.classList.toggle('hot', d <= WINDOW); },
    secret: () => ({ hits }),
  };
}

const WORDS = ['PORTAIL', 'SIGNAL', 'MIROIR', 'LUCIOLE', 'CRISTAL', 'NEBULEUSE', 'HORIZON', 'BOUSSOLE'];
const shiftWord = (w, k) => w.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + k + 2600) % 26 + 65));
function sleep(ctx) {
  const word = WORDS[ctx.rnd() * WORDS.length | 0], k = 1 + (ctx.rnd() * 9 | 0), cipher = shiftWord(word, k); let s = 0, prev, val;
  const draw = () => { if (prev) { const w = shiftWord(cipher, -s), n = Math.ceil(w.length / 2); prev.textContent = w.slice(0, n) + '·'.repeat(w.length - n); /* aperçu : première moitié seulement (avant : mot entier) */ val.textContent = `décalage ${s}`; } };
  const set = d => { s = (s + d + 10) % 10; ctx.sfx.tick(); draw(); };
  const validate = () => (s === k ? ctx.grant() : ctx.deny('mot de passe illisible'));
  return {
    help: 'Le mot de passe est chiffré par décalage (César, 1 à 9). Règle le décalage jusqu\'à lire un vrai mot, puis valide.',
    clueLines: () => ['SOMMEIL', `décalage ${k}`], clueText: () => `décalage ${k}`,
    mount(el) { el.append(h('p', 'lk-cipher', cipher)); prev = h('p', 'lk-preview'); val = h('span', 'lk-val');
      const row = h('div', 'lk-dial'); row.append(btn('−', 'dn', 'alt'), val, btn('+', 'up', 'alt')); el.append(prev, row, btn('VALIDER', 'ok', 'go wide'));
      el.addEventListener('click', e => { const a = e.target.closest('[data-act]')?.dataset.act; if (a === 'dn') set(-1); else if (a === 'up') set(1); else if (a === 'ok') validate(); }); draw(); },
    key(e) { const c = e.code, d = digitOf(c); if (c === 'ArrowLeft' || c === 'ArrowDown' || c === 'KeyA') { set(-1); return true; } if (c === 'ArrowRight' || c === 'ArrowUp' || c === 'KeyD') { set(1); return true; }
      if (d != null) { s = +d; ctx.sfx.tick(); draw(); return true; } if (isEnter(c)) { validate(); return true; } return false; },
    update() {}, secret: () => ({ k, word, s }),
  };
}

function source(ctx) {
  const frags = ctx.frags(); // [{n, title, code}] dans l'ordre des nœuds
  const decoys = []; while (decoys.length < 2) { const c = (ctx.rnd() * 256 | 0).toString(16).toUpperCase().padStart(2, '0'); if (!frags.some(f => f.code === c) && !decoys.includes(c)) decoys.push(c); }
  const choices = shuffle([...frags.map(f => f.code), ...decoys], ctx.rnd); let entry = [], slots, list;
  const draw = () => { slots?.forEach((s, i) => { s.textContent = entry[i] ?? '··'; }); };
  const add = c => { if (entry.length >= 5) return; entry.push(c); ctx.sfx.key(); draw(); if (entry.length === 5) check(); };
  const check = () => { if (entry.every((c, i) => c === frags[i].code)) ctx.grant(); else { entry = []; draw(); ctx.deny('séquence source invalide'); } };
  return {
    help: 'Rentre les cinq fragments dans l\'ordre des verrous (01 → 05). Deux codes sont des leurres. Les codes sont dans ta liste de fragments.',
    mount(el) { list = h('p', 'lk-frags', frags.map(f => `${String(f.n).padStart(2, '0')} ${f.title}`).join(' → ') /* codes retirés d’ici : lis-les dans ta liste (avant : affichés) */); slots = [0, 1, 2, 3, 4].map(() => h('span', 'lk-slot', '··'));
      const sl = h('div', 'lk-slots'); sl.append(...slots); const pad = h('div', 'lk-pad src'); choices.forEach((c, i) => { const b = btn(c, c); b.append(h('small', null, String(i + 1))); pad.append(b); }); pad.append(btn('⌫', 'del', 'alt'));
      pad.addEventListener('click', e => { const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return; if (a === 'del') { entry.pop(); draw(); } else add(a); }); el.append(list, sl, pad); draw(); },
    key(e) { const d = digitOf(e.code); if (d >= 1 && d <= choices.length) { add(choices[d - 1]); return true; } if (e.code === 'Backspace') { entry.pop(); draw(); return true; } return false; },
    update() {}, secret: () => ({ order: frags.map(f => f.code), choices }),
  };
}

export const LOCKS = { spoon, rabbit, desert, choice, sleep, source };
