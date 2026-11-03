# Virtual Matrix · Lockdown

Tu voles librement dans une grille de code. Six nœuds y sont **verrouillés**. Chaque erreur affiche un énorme **ACCESS DENIED** rouge qui s'empile à l'écran. Chaque réussite déclenche un **ACCESS GRANTED** vert et te donne un fragment de code. Ouvre les cinq verrous, puis rentre leurs fragments dans la **SOURCE**.

▶ **Jouer :** https://passcool17.github.io/virtual-matrix/ (GitHub Pages, servi depuis la racine de `main`)

Miroir possible : https://passcool17.gitlab.io/virtual-matrix/ (GitLab Pages via `.gitlab-ci.yml`)

## Comment jouer
1. Choisis la **pilule rouge**.
2. Vole jusqu'à un nœud entouré d'une cage rouge. Le radar et le « SIGNAL » t'indiquent le plus proche.
3. À moins de 3,6 m, appuie sur **E** (ou **DÉCODER** sur mobile) pour ouvrir le verrou.
4. Résous l'énigme. **Échap** ou **✕ Quitter** referme le verrou sans pénalité.
5. Chaque *DENIED* fait monter le **pare-feu** :
   - niveau 1 : la pluie devient rouge ;
   - niveau 2 : le brouillard se resserre ;
   - niveau 3 : une **sentinelle** te traque. Si elle te touche, elle vole ton dernier fragment, referme son verrou et te repousse.
6. Ton score, c'est ton **temps** plus le nombre de **DENIED**. Ton meilleur score est enregistré sur ton appareil.

| Verrou | Énigme |
|---|---|
| 01 CUILLÈRE | Code de 4 chiffres distincts (1–6). Après chaque essai, tu vois combien de chiffres sont bien placés et combien sont mal placés. |
| 02 LAPIN | Répète une séquence de symboles clignotants, en 3 rondes (3, 4 puis 5 symboles). |
| 03 DÉSERT | Aligne le glyphe cible sur 3 anneaux. Attention, tourner un anneau fait aussi tourner celui du dessous. |
| 04 CHOIX | Frappe en rythme avec le battement du nœud, 3 fois de suite. |
| 05 SOMMEIL | Mot de passe chiffré par décalage (César). Règle le décalage jusqu'à lire un vrai mot. |
| 06 SOURCE | Rentre les 5 fragments dans l'ordre, sans te laisser piéger par les 2 leurres. |

**Indices :** des glyphes flottent dans le monde. L'un donne un chiffre de la CUILLÈRE, l'autre le décalage du SOMMEIL. Ils facilitent les énigmes, mais tu peux t'en passer.

## Commandes
- **Clavier :** ZQSD ou WASD (la position physique des touches compte, donc ça marche aussi en AZERTY) ou les flèches pour voler. Espace ou Q (A en AZERTY) pour monter, Ctrl ou C pour descendre, Maj pour le turbo, E ou Entrée pour crocheter, Échap ou P pour la pause, M pour couper le son.
- **Souris :** clique pour capturer le regard (pointer lock).
- **Manette :** stick gauche pour voler, stick droit pour regarder, A pour crocheter, RT et LT pour monter et descendre, Start pour la pause.
- **Mobile :** joystick à gauche, glisse sur la moitié droite de l'écran pour regarder, ▲ et ▼ pour monter et descendre, DÉCODER pour crocheter.
- Toutes les énigmes se jouent au clavier, à la souris et au toucher.

## Musique
Quatre pistes d'ambiance composées par Pascal (`music/`, MP3 128 kb/s) : **theme-1** et **theme-2** jouent au menu et en vol calme, **escape-1** et **escape-2** prennent le relais dès que le pare-feu atteint le niveau 2 et pendant le verrou SOURCE. Le passage se fait en fondu enchaîné de 2,5 s, et chaque liste tourne en boucle. La musique démarre au premier clic ou à la première touche (règle d'autolecture des navigateurs) et elle est lue en streaming. Les effets synthétisés jouent par-dessus, et M ou le bouton ♪ coupent tout.

## Lancer en local
```sh
node tools/serve.js      # http://localhost:8642/   (?qa=1 = démarrage direct, ?seed=n = énigmes reproductibles)
node tools/test.cjs      # vérification Playwright, ordi + mobile
node tools/test-music.cjs  # musique : 1er geste, bascule d'alerte, rotation, sourdine
```
`index.html` est à la racine du dépôt et tous les chemins sont relatifs : le dépôt est publiable tel quel (GitHub Pages, branche `main`, dossier `/` ; `.nojekyll` désactive Jekyll). Le jeu n'a ni étape de build ni dépendance : three.js r170 est inclus dans `vendor/`, et les polices Orbitron et Share Tech Mono (licence OFL) dans `fonts/`.
