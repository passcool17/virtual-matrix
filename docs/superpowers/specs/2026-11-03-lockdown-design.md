# Virtual Matrix · Lockdown: design

Date: 2026-11-03. Approved by Pascal (base = ANALYSIS.md of the original + "locks" request inspired by Lawnmower Man).

## Goal
Recreate Virtual Matrix (6DoF flight in a green lattice, 6 nodes) as plain static files, and turn every node into a lock: a puzzle where each failure stacks an "ACCESS DENIED" and success bursts "ACCESS GRANTED".

## Constraints
- three.js r170 vendored (`vendor/three.module.min.js`), ES modules, no build step, static files, GitLab Pages (`public/` produced by CI).
- Local fonts: Orbitron (display) and Share Tech Mono (mono), OFL.
- UI in French; original sentences (no film quotes); fictional content only.
- Keyboard by `event.code` (AZERTY ZQSD = physical WASD).
- `?qa=1` = jack in immediately. Test hooks: `window.__vm`.
- Game time `G.t` (dt capped at 0.1 s) for everything that's timed (locks, alert, DENIED lines); tests wait on `G.t`.

## Recreated (identical to the original)
CONFIG: wrap 36, yMin 1.2, yMax 42, flySpeed 14, boostMul 2.05, lookSens 0.0022, hackRange 3.6, start (0,8,24).
Scene: FogExp2 #040806 0.03, 160² floor grid, 64³ lattice (8-unit step) + 405 cubes, 420 rain sticks (+12%/opened lock), core at (0,10,0) (3 tori + octahedron), central beam, 28 packets, 6 nodes (octahedron + glow sprite).
Screens: menu (red/blue pill, NŒUDS / MEILLEUR / VOL), MONDE RÉEL, HUD (coordinates, NŒUDS n/6, mute, Pause, desktop radar, reticle, signal/prompt), pause (Reprendre / Son / Déconnexion), end (SOURCE OUVERTE).
Look: palette bg #040806, surface #0a140e, fg #d7f8de, muted #6f9a78, dim #3d5c44, primary #5dff8a, danger #c4453c, border #1c3a26; scanlines, vignette, brackets, green flash (trauma²), katakana rain canvas on the menu/end.
Audio: synthesized WebAudio (drone 55/82.4/110 Hz + filtered noise, jack-in, decode, buzz, final chord) + lock sounds (key, tick, granted).
Controls: WASD/ZQSD/arrows, Space/Q up, Ctrl/C down, Shift turbo, E/Enter decode, Esc/P pause, M mute; pointer lock; gamepad (sticks, A, RT/LT, Start); touch: joystick, ▲/▼, DÉCODER, right-side drag to look. On mobile the menu shows touch instructions.

## New: locks
E within 3.6 m of an unopened node → lock overlay (terminal). While the overlay is open: no flight, the pointer is released (without pausing), the world keeps running (sentinel at 35% speed). Esc/✕ closes it without penalty. All locks work with keyboard, mouse and touch (buttons ≥ 44 px).

| Node | Puzzle | Keyboard | Clue (in the world) |
|---|---|---|---|
| CUILLÈRE | 4-digit code (distinct digits 1–6), feedback per try: "n bien placés · m mal placés" | 1–6, Backspace, Enter | glyph near LAPIN: "CUILLÈRE · chiffre k = d" |
| LAPIN | Simon of 4 symbols, sequence 3 → 4 → 5 (3 rounds); a mistake replays the round | 1–4 | none |
| DÉSERT | 3 rings of 8 glyphs, align the target glyph at the top. Turning a ring also drives the next ring (coupled), then VALIDER | ↑/↓ choose ring, ←/→ turn, Enter | none |
| CHOIX | the node pulses (period 1.1 s), hit the window (±0.14 s around the peak) 3 times; a miss resets the counter | Space/E/Enter | none |
| SOMMEIL | password shown in Caesar cipher (shift 1–9). Dial −/+ that decodes as a preview, VALIDER | ←/→, Enter | glyph near DÉSERT: "SOMMEIL · décalage k" |
| SOURCE | locked until the other 5 are open (otherwise DENIED with no alert). Choose the 5 fragments in node order (01→05); 5 slots | 1–5 picks the n-th button, Backspace, Enter | the HUD lists the fragments "01:7F …" |

Clues: floating text sprite (canvas) that pulses; captured within 6 m → toast "INDICE CAPTÉ" + listed in the lock overlay. Without the clue: CUILLÈRE = normal Mastermind, SOMMEIL = scan shifts 1–9 (each wrong VALIDER = DENIED).
Code fragment: each opened lock gives 2 random hex characters (e.g. "7F").

## ACCESS DENIED / GRANTED
- DENIED: `#denied` layer, each failure appends a red line "ACCESS DENIED" (Orbitron, large, shake animation, ±12° tilt / random offset), accumulating (max 14). A line lives 6 s of game time. Buzz + small trauma.
- GRANTED: green burst "ACCESS GRANTED" (scale + glow, 1.6 s), clears the DENIED stack, then the node sentence + fragment in the banner. Strong trauma + decode sound.

## Firewall alert
`alert` 0…8: DENIED +1, GRANTED −2, decay −1 / 15 s. Level = 0 (<2), 1 (≥2), 2 (≥4), 3 (≥6).
- 1: 3D rain → red #ff3b30 (lerp), HUD in red.
- 2: fog 0.03 → 0.075.
- 3: a sentinel (red wireframe icosahedron + glow) appears 30 m away and hunts the player at 9 u/s (turbo escapes it). Contact < 2 m: the last opened lock closes again (fragment lost), the player is pushed back 12 m, alert → 4, sentinel removed.
HUD: "PARE-FEU" + 3 segments.

## Score
Run time (game time while playing) + DENIED count. Ranking: `t + 5·denied`. localStorage `vm-lockdown-best` = `{t, denied}`. Menu MEILLEUR = "m:ss · n✕" or "—". End screen: time, DENIED, best, "NOUVEAU RECORD".

## Files
index.html, style.css, js/{config,audio,rain2d,input,world,locks,main}.js (HUD/screens live in main.js), tools/{serve.js,test.cjs}, README.md, GAME.md, .gitlab-ci.yml.

## Verification
Playwright headless SwiftShader, one browser at a time: 0 JS errors; desktop 1280×720 + mobile 390×844 captures (menu, flight, 6 overlays, DENIED stack, GRANTED, alert 3 + sentinel, end); each lock solved through a hook AND through simulated input (keys/clicks/taps); full run to the end; DOM overlap measurement (HUD and mobile overlays); FPS.
