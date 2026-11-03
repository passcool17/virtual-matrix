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
- Musique de Pascal : thème ↔ escape (pare-feu ≥ 2 ou SOURCE), fondu de 2,5 s, rotation, démarrage au premier geste, streaming (`js/music.js`).
- Résolution adaptative : la définition baisse sous 28 img/s.
- Accroches de test : `window.__vm` (`solve`, `open`, `tp`, `tpClue`, `setAlert`, `secret`, `waitT`). `?qa=1` lance la partie directement et `?seed=n` rend les énigmes reproductibles.

## Prochaines idées
- Mode « contre-la-montre » quotidien, avec la même graine pour tout le monde.
- Davantage d'indices écrits dans la pluie : des colonnes qui forment un chiffre.
- Une deuxième sentinelle au niveau 3+, qui patrouille au lieu de traquer.
- Des verrous qui se mélangent d'une partie à l'autre (n'importe quelle énigme sur n'importe quel nœud).
- Un tableau des scores en ligne, si Pascal le veut un jour.
