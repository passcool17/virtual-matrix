# GAME.md · Virtual Matrix · Lockdown

## Concept
C'est une recréation de *Virtual Matrix* de Pascal : vol libre en 6DoF dans un treillis vert, sous une pluie de code. On y ajoute un *Lockdown* inspiré de la scène d'accès de *The Lawnmower Man* : chaque nœud est un verrou, chaque erreur empile des ACCESS DENIED, et chaque réussite fait exploser un ACCESS GRANTED. Toutes les phrases des nœuds sont originales.

## Boucle de jeu
Tu explores, tu repères un nœud, tu ouvres son verrou, tu résous l'énigme et tu récupères un fragment. La SOURCE ne s'ouvre qu'avec les 5 fragments. Les erreurs font monter le pare-feu, ce qui teinte la pluie en rouge, épaissit le brouillard puis lâche une sentinelle. Il y a donc une vraie tension entre aller vite et risquer des DENIED.

## Commandes
Voir README.md. Les touches sont lues par `event.code`. La version mobile utilise un joystick, ▲ et ▼, DÉCODER, et un glissé à droite pour regarder.

## État actuel (2026-11-03)
- Monde recréé avec les valeurs de l'original : vitesse 14, turbo ×2,05, bouclage ±36, altitude 1,2 à 42, portée de 3,6 m, et les mêmes couleurs, polices, effets et sons synthétisés.
- Les 6 verrous sont jouables, ainsi que les 2 indices du monde.
- Pare-feu à 3 niveaux et sentinelle voleuse de fragments.
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
- Une deuxième sentinelle au niveau 3+, qui patrouille au lieu de traquer.
- Des verrous qui se mélangent d'une partie à l'autre (n'importe quelle énigme sur n'importe quel nœud).
- Un tableau des scores en ligne, si Pascal le veut un jour.
