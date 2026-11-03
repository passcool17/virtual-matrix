// Constantes du jeu (valeurs reprises de l'original) + nœuds et pare-feu.
export const CFG = { wrap: 36, yMin: 1.2, yMax: 42, flySpeed: 14, boostMul: 2.05, lookSens: 0.0022, hackRange: 3.6, clueRange: 6, start: [0, 8, 24] };
export const COL = { bg: 0x040806, lattice: 0x143d24, node: 0x5dff8a, nodeDim: 0x1a5c32, rain: 0x3dff78, red: 0xff3b30, core: 0x7cff9b, packet: 0x9dffc0 };
export const NODES = [
  { id: 'spoon', title: 'CUILLÈRE', x: -16, y: 6.5, z: -8, phrase: "Le métal ne plie pas. C'est ta certitude qui cède la première." },
  { id: 'rabbit', title: 'LAPIN', x: 20, y: 10, z: 12, phrase: 'Les traces blanches mènent toujours plus bas que prévu.' },
  { id: 'desert', title: 'DÉSERT', x: -8, y: 16, z: 20, phrase: "Sous la grille, il n'y a que du sable et des chiffres froids." },
  { id: 'choice', title: 'CHOIX', x: 12, y: 4.5, z: -22, phrase: 'Chaque porte que tu ouvres en referme mille derrière toi.' },
  { id: 'sleep', title: 'SOMMEIL', x: -22, y: 12, z: -16, phrase: 'Le rêveur croit voler. Le code, lui, sait qu\'il tombe.' },
  { id: 'source', title: 'SOURCE', x: 0, y: 22, z: 0, phrase: "Tout ce que tu as vu était écrit. Maintenant, c'est toi qui écris." },
];
// Indices flottants : posés près d'un autre nœud.
export const CLUES = [
  { id: 'spoon', near: 'rabbit', off: [3.5, 2.5, -3] },
  { id: 'sleep', near: 'desert', off: [-4, 2, -3] },
];
export const ALERT = { perDeny: 1, perGrant: 2, decay: 1 / 15, max: 8, sentinelSpeed: 9, hit: 2, push: 12 };
export const alertLevel = a => (a >= 6 ? 3 : a >= 4 ? 2 : a >= 2 ? 1 : 0);
export const BEST_KEY = 'vm-lockdown-best';
