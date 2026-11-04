# GAME.md · Virtual Matrix · Lockdown

## Concept
C'est une recréation de *Virtual Matrix* de Pascal : vol libre en 6DoF dans un treillis vert, sous une pluie de code. On y ajoute un *Lockdown* inspiré de la scène d'accès de *The Lawnmower Man* : chaque nœud est un verrou, chaque erreur empile des ACCESS DENIED, et chaque réussite fait exploser un ACCESS GRANTED. Toutes les phrases des nœuds sont originales.

## Boucle de jeu
Tu explores, tu repères un nœud, tu ouvres son verrou, tu résous l'énigme et tu récupères un fragment. La SOURCE ne s'ouvre qu'avec les 5 fragments. Les erreurs font monter le pare-feu, ce qui teinte la pluie en rouge, épaissit le brouillard puis lâche une sentinelle. Il y a donc une vraie tension entre aller vite et risquer des DENIED.

## Commandes
Voir README.md. Les touches sont lues par `event.code`. La version mobile utilise un joystick, ▲ et ▼, DÉCODER, et un glissé à droite pour regarder.

## État actuel (2026-11-04)
- Monde recréé avec les valeurs de l'original : vitesse 14, turbo ×2,05, bouclage ±36, altitude 1,2 à 42, portée de 3,6 m, et les mêmes couleurs, polices, effets et sons synthétisés.
- Les 6 verrous sont jouables, ainsi que les 2 indices du monde.
- Pare-feu à 3 niveaux et sentinelle voleuse de fragments.
- Sentinelles (js/sentinel.js, IA réécrite le 2026-11-04) : modèle procédural instancié (~7 draw calls), cône rouge **enfant du groupe** (pas du corps qui oscille) dont le sommet et l'axe sont exactement ceux de la détection (`coneApex`/`coneAxis`/`inCone`, 30° de demi-angle, 22 m, inclinaison suivie).
  - États : Patrouille → Soupçon → TRAQUE → Recherche → Patrouille (+ Brouillée). Patrouille entre les verrous encore fermés, biaisée vers la zone du joueur, tête qui balaie. Soupçon : va voir le dernier point connu. Traque : interception (prédiction de la trajectoire), pare-feu +1 (recharge 8 s). Ligne de vue perdue 2,5 s → Recherche (6 s autour du point prédit, tourne sur place) → Patrouille.
  - Sens : vue (cône + ligne de vue bloquée par les 6 piliers et la sphère de `OCC` dans config.js ; plus on est proche, plus ça monte vite : ~0,55 s à bout portant, ~1,6 s au bout du cône) et **signature énergétique** : en antigravité, plus on file vite/accélère, plus on émet (`G.sig` 0..1) ; rayon de captation 4 → 22 m selon la vitesse ; flotter lentement (sig < 0,12) = indétectable. Une sentinelle qui capte une signature « syntonise » (halo et cône qui vibrent) et le HUD affiche « Fréquence captée ».
  - Capture : à < 2,4 m et vu pendant 0,5 s (HUD « CONTACT » + bips rapides) → éjecté à 14 m, pare-feu +1, +8 s au chrono.
  - Contre-jeu : casser la ligne de vue / se cacher derrière un pilier, ralentir ou flotter (signature basse), **impulsion** (E/DÉCODER loin d'un nœud) qui brouille 3 s les sentinelles à < 11 m en vue (recharge 15 s, « ⌁ » au HUD quand prête).
  - Pare-feu ≥ 2 : la 2e sentinelle est recrutée et **coupe la route** (prédiction doublée + décalage latéral) ; vue partagée entre les deux.
  - Équité : grâce de 4 s, cachées et figées pendant les énigmes (sauf menace visuelle à la SOURCE), zone sûre de 3,6 m autour des verrous fermés, HUD d'état coloré, musique d'alerte pendant une traque. Au niveau 3 la sentinelle 0 devient la voleuse de fragments (inchangée), puis repart en Recherche.
  - HUD : `#hSent` (état + jauge) et `#hSig` « SIGNATURE ÉNERGÉTIQUE » (jauge verte/ambre/rouge) + aura CSS qui pulse plus vite avec la vitesse (0 draw call). Piliers : 2 draw calls (InstancedMesh + arêtes fusionnées).
  - Les sentinelles sont dessinées du côté de la caméra sur le monde torique (avant : invisibles près du raccord alors qu'elles détectaient).
  - Tests : tools/test-sentinel.cjs (11), tools/test-sentinel-ia.cjs (16, `mobile` en option), joueur bot tools/bot-run.cjs [seed] [lockT] [roam], captures tools/shot-sentinel-ia.cjs → shots/sentinelle-ia/.
- Score = temps + DENIED, enregistré dans localStorage (`vm-lockdown-best`).
- Musique de Pascal, une piste par étape dans l'ordre 1:53 → 2:05 → 2:13 → 2:16 : menu `escape-1`, vol calme `theme-1`, pare-feu ≥ 2 `escape-2`, verrou final SOURCE `theme-2` (l'écran de fin revient à `escape-1`). Fondu de 2,5 s, chaque piste boucle, retour au calme après 4 s sans alerte, démarrage au premier geste, streaming (`js/music.js`).
- CUILLÈRE adoucie (2026-11-03) : dans l'historique, les chiffres bien placés s'allument en vert à leur position ; les mal placés restent un simple compte. Avant, seul le total « x bien placés · y mal placés » était donné.
- Autres verrous un peu durcis (2026-11-03), sans changer les nombres dits par la voix : LAPIN clignote plus vite (un symbole toutes les 0,6 s, allumé 0,45 s ; avant 0,7 s / 0,55 s) ; DÉSERT montre 3 glyphes par anneau (avant 5) ; CHOIX fenêtre de frappe ±0,12 s (avant ±0,14 s) ; SOMMEIL l'aperçu ne déchiffre que la première moitié du mot (avant le mot entier) ; SOURCE le verrou ne liste plus que l'ordre des verrous, les codes se lisent dans la liste de fragments du HUD (avant ils étaient recopiés dans le verrou).
- Voix de la machine : consigne vocale par verrou à l'ouverture, musique baissée à 35 %, coupée à la fermeture, bouton ◉ voix pour réécouter, coupée par la sourdine (`js/voice.js`, `voice/`).
- Résolution adaptative : la définition baisse sous 28 img/s.
- Accroches de test : `window.__vm` (`solve`, `open`, `tp`, `tpClue`, `setAlert`, `secret`, `waitT`). `?qa=1` lance la partie directement et `?seed=n` rend les énigmes reproductibles.

## Prochaines idées
- Mode « contre-la-montre » quotidien, avec la même graine pour tout le monde.
- Davantage d'indices écrits dans la pluie : des colonnes qui forment un chiffre.
- Des verrous qui se mélangent d'une partie à l'autre (n'importe quelle énigme sur n'importe quel nœud).
- Un tableau des scores en ligne, si Pascal le veut un jour.
