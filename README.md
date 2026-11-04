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
   - Des **sentinelles** patrouillent (une seconde dès le niveau 2). Si tu restes environ 1,5 s dans leur cône rouge, l'alerte « SENTINELLE · détection » se remplit puis le pare-feu monte d'un cran ; elle te poursuit quelques secondes puis perd ta trace si tu t'éloignes. Elles ne bougent pas pendant un verrou et ne te repèrent jamais près d'un nœud.
6. Ton score, c'est ton **temps** plus le nombre de **DENIED**. Ton meilleur score est enregistré sur ton appareil.

| Verrou | Énigme |
|---|---|
| 01 CUILLÈRE | Code de 4 chiffres distincts (1–6). Après chaque essai, les chiffres bien placés s'allument en vert à leur position ; les mal placés sont seulement comptés. |
| 02 LAPIN | Répète une séquence de symboles clignotants, en 3 rondes (3, 4 puis 5 symboles), un symbole toutes les 0,6 s. |
| 03 DÉSERT | Aligne le glyphe cible sur 3 anneaux ; chaque anneau ne montre que 3 glyphes à la fois. Attention, tourner un anneau fait aussi tourner celui du dessous. |
| 04 CHOIX | Frappe en rythme avec le battement du nœud (fenêtre ±0,12 s), 3 fois de suite. |
| 05 SOMMEIL | Mot de passe chiffré par décalage (César). Règle le décalage (1 à 9) ; l'aperçu ne déchiffre que la première moitié du mot. |
| 06 SOURCE | Rentre les 5 fragments dans l'ordre, sans te laisser piéger par les 2 leurres. Les codes se lisent dans ta liste de fragments (HUD). |

**Indices :** des glyphes flottent dans le monde. L'un donne un chiffre de la CUILLÈRE, l'autre le décalage du SOMMEIL. Ils facilitent les énigmes, mais tu peux t'en passer.

## Commandes
- **Clavier :** ZQSD ou WASD (la position physique des touches compte, donc ça marche aussi en AZERTY) ou les flèches pour voler. Espace ou Q (A en AZERTY) pour monter, Ctrl ou C pour descendre, Maj pour le turbo, E ou Entrée pour crocheter, Échap ou P pour la pause, M pour couper le son.
- **Souris :** clique pour capturer le regard (pointer lock).
- **Manette :** stick gauche pour voler, stick droit pour regarder, A pour crocheter, RT et LT pour monter et descendre, Start pour la pause.
- **Mobile :** joystick à gauche, glisse sur la moitié droite de l'écran pour regarder, ▲ et ▼ pour monter et descendre, DÉCODER pour crocheter.
- Toutes les énigmes se jouent au clavier, à la souris et au toucher.

## Musique
Quatre pistes d'ambiance composées par Pascal (`music/`, MP3 128 kb/s) : une piste par étape, dans l'ordre choisi par Pascal : **escape-1** (1:53) au menu, **theme-1** (2:05) en vol calme, **escape-2** (2:13) dès que le pare-feu atteint le niveau 2, **theme-2** (2:16) pendant le verrou final SOURCE. Le passage se fait en fondu enchaîné de 2,5 s, chaque piste boucle, et le retour au calme attend 4 s sans alerte. La musique démarre au premier clic ou à la première touche (règle d'autolecture des navigateurs) et elle est lue en streaming. Les effets synthétisés jouent par-dessus, et M ou le bouton ♪ coupent tout.

## Voix de la machine
Chaque verrou a sa consigne vocale (`voice/machine_puzzle_0X_*.mp3`, mono 64 kb/s, 5,6 à 8,9 s, 339 Ko au total). Elle joue une fois à l'ouverture du verrou, la musique baisse à 35 % pendant qu'elle parle puis remonte, et quitter le verrou la coupe. La rouvrir rejoue la consigne ; le bouton **◉ voix** de l'en-tête (qui pulse pendant la lecture) la rejoue aussi. M et le bouton ♪ coupent aussi la voix. Un seul élément `<audio>` est réutilisé et débloqué au premier geste, ce qui permet la lecture sur iOS (le déblocage joue 10 ms de silence intégré, aucun téléchargement). Si un fichier manque, le verrou fonctionne normalement, en silence.

## Lancer en local
```sh
node tools/serve.js      # http://localhost:8642/   (?qa=1 = démarrage direct, ?seed=n = énigmes reproductibles)
node tools/test.cjs      # vérification Playwright, ordi + mobile
node tools/test-music.cjs  # musique : 1er geste, piste de chaque étape (ordre 1→4), fondu, boucle, sourdine
node tools/test-voice.cjs  # voix : bon fichier par verrou, musique baissée, fermeture, sourdine, fichier manquant
```
`index.html` est à la racine du dépôt et tous les chemins sont relatifs : le dépôt est publiable tel quel (GitHub Pages, branche `main`, dossier `/` ; `.nojekyll` désactive Jekyll). Le jeu n'a ni étape de build ni dépendance : three.js r170 est inclus dans `vendor/`, et les polices Orbitron et Share Tech Mono (licence OFL) dans `fonts/`.
