// ICH !!! — Recettes Cookeo riches en protéines.
// Macros par portion, calculées à partir des valeurs moyennes des ingrédients crus (approximatives).
// Dans les étapes, **texte** s'affiche en gras (modes et temps du Cookeo).

import { daysBetween, shiftDay } from './food.js';

export const RECIPES = [
  {
    id: 'curry', emoji: '🍛', name: 'Poulet curry coco & riz', tag: 'Prise de masse',
    portions: 4, time: 25, kcal: 580, p: 44, l: 12, g: 70,
    ingredients: [
      '600 g de blanc de poulet, en dés',
      '300 g de riz basmati, rincé',
      '400 ml de lait de coco léger',
      '200 ml d\'eau',
      '200 g de petits pois surgelés',
      '1 oignon',
      '1 c. à soupe d\'huile',
      '2 c. à soupe de curry, sel, poivre'
    ],
    steps: [
      'Mode **Dorer** : fais revenir l\'oignon émincé dans l\'huile 2 min, puis le poulet et le curry 3 min.',
      'Verse l\'eau et racle bien le fond pour décoller les sucs : c\'est ce qui évite que le riz attache.',
      'Ajoute le riz, le lait de coco et le sel. Mélange, puis pose les petits pois sur le dessus sans mélanger.',
      'Ferme, **Cuisson rapide 8 min**.',
      'À l\'ouverture, mélange et laisse reposer 2 min : le riz finit d\'absorber la sauce.'
    ],
    tip: 'Se garde 3 jours au frigo : parfait pour préparer les repas du lundi au mercredi.'
  },
  {
    id: 'chili', emoji: '🌶️', name: 'Chili con carne & riz', tag: 'Prise de masse',
    portions: 4, time: 35, kcal: 615, p: 45, l: 11, g: 82,
    ingredients: [
      '600 g de bœuf haché 5 %',
      '280 g de riz basmati',
      '1 boîte de haricots rouges (250 g égouttés)',
      '1 boîte de tomates concassées (400 g)',
      '150 g de maïs égoutté',
      '1 poivron rouge, 1 oignon',
      '2 c. à soupe de concentré de tomate',
      '1 c. à soupe d\'huile',
      '1 c. à café de cumin, 1 de paprika, piment au goût'
    ],
    steps: [
      'Le riz d\'abord : riz rincé et 1,5 fois son volume d\'eau salée, **Cuisson rapide 8 min**. Réserve-le et rince la cuve.',
      'Mode **Dorer** : oignon et poivron en dés dans l\'huile 3 min, puis le bœuf 5 min en l\'émiettant.',
      'Ajoute les épices et le concentré, mélange 1 min, puis les tomates, les haricots, le maïs et 100 ml d\'eau. Racle bien le fond.',
      'Ferme, **Cuisson rapide 10 min**.',
      'Trop liquide ? Repasse en mode **Dorer** 3 à 4 min sans couvercle, en remuant.'
    ],
    tip: 'Encore meilleur réchauffé le lendemain.'
  },
  {
    id: 'bolo', emoji: '🍝', name: 'Pâtes bolognaise one-pot', tag: 'Prise de masse',
    portions: 4, time: 25, kcal: 640, p: 45, l: 13, g: 83,
    ingredients: [
      '400 g de penne',
      '500 g de bœuf haché 5 %',
      '1 boîte de tomates concassées (400 g)',
      '200 g de coulis de tomate',
      '700 ml d\'eau',
      '1 oignon, 1 carotte',
      '1 c. à soupe d\'huile',
      '40 g de parmesan râpé',
      'Herbes de Provence, sel, poivre'
    ],
    steps: [
      'Mode **Dorer** : oignon et carotte râpée dans l\'huile 2 min, puis le bœuf 5 min en l\'émiettant. Sale, poivre, ajoute les herbes.',
      'Ajoute les pâtes et l\'eau : elles doivent être juste couvertes. Mélange.',
      'Verse les tomates et le coulis **par-dessus, sans mélanger** : la tomate au fond de la cuve attache.',
      'Ferme, **Cuisson rapide 5 min**.',
      'Mélange, parsème de parmesan et laisse reposer 2 min.'
    ],
    tip: 'Avec des pâtes plus longues à cuire (rigatoni : 13 min à la casserole), passe à 6 min.'
  },
  {
    id: 'risotto', emoji: '🍄', name: 'Risotto poulet champignons', tag: 'Prise de masse',
    portions: 4, time: 25, kcal: 510, p: 40, l: 9, g: 63,
    ingredients: [
      '500 g de blanc de poulet, en dés',
      '300 g de riz arborio (riz à risotto)',
      '250 g de champignons de Paris',
      '800 ml de bouillon de volaille chaud (1 cube)',
      '1 oignon',
      '1 c. à soupe d\'huile',
      '50 g de parmesan râpé'
    ],
    steps: [
      'Mode **Dorer** : oignon dans l\'huile 2 min, puis le poulet 3 min et les champignons émincés 2 min.',
      'Ajoute le riz et remue 1 min, jusqu\'à ce qu\'il devienne translucide.',
      'Verse le bouillon et racle le fond.',
      'Ferme, **Cuisson rapide 6 min**.',
      'Ajoute le parmesan et mélange vivement 1 min : c\'est ce qui rend le risotto crémeux.'
    ],
    tip: 'Trop sec à l\'ouverture ? Un trait de bouillon ou de lait, et ça repart.'
  },
  {
    id: 'dhal', emoji: '🥘', name: 'Dhal de lentilles corail au poulet', tag: 'Prise de masse',
    portions: 4, time: 35, kcal: 670, p: 45, l: 12, g: 87,
    ingredients: [
      '250 g de lentilles corail, rincées',
      '400 g de blanc de poulet, en dés',
      '240 g de riz basmati',
      '400 ml de lait de coco léger',
      '1 boîte de tomates concassées (400 g)',
      '500 ml d\'eau',
      '1 oignon, 2 gousses d\'ail, 1 morceau de gingembre',
      '1 c. à soupe d\'huile',
      '2 c. à café de garam masala ou de curry, 1 de curcuma, 1 de cumin'
    ],
    steps: [
      'Le riz d\'abord : riz rincé et 1,5 fois son volume d\'eau salée, **Cuisson rapide 8 min**. Réserve-le et rince la cuve.',
      'Mode **Dorer** : oignon, ail et gingembre dans l\'huile 2 min, puis le poulet et les épices 3 min.',
      'Ajoute les lentilles, l\'eau, les tomates et le lait de coco. Racle bien le fond.',
      'Ferme, **Cuisson rapide 7 min**.',
      'Mélange : les lentilles doivent être fondantes. Sale et ajoute un filet de citron.'
    ],
    tip: 'Les lentilles corail apportent 24 g de protéines pour 100 g crues : le dhal est un vrai plat de muscu.'
  },
  {
    id: 'boeuf', emoji: '🥕', name: 'Bœuf carottes pommes de terre', tag: 'Prise de masse',
    portions: 4, time: 55, kcal: 570, p: 49, l: 15, g: 56,
    ingredients: [
      '800 g de bœuf à braiser (paleron ou joue), en gros cubes',
      '800 g de pommes de terre',
      '600 g de carottes',
      '2 oignons',
      '400 ml de bouillon de bœuf (1 cube)',
      '2 c. à soupe de farine',
      '2 c. à soupe de concentré de tomate',
      '1 c. à soupe d\'huile, thym, laurier'
    ],
    steps: [
      'Mode **Dorer** : saisis la viande en 2 fois, 3 min par fournée, pour bien la colorer. Ajoute les oignons émincés 2 min.',
      'Saupoudre la farine, ajoute le concentré, mélange 1 min, puis verse le bouillon en raclant bien le fond. Ajoute le thym et le laurier.',
      'Ferme, **Cuisson rapide 25 min**.',
      'Ouvre, ajoute les carottes en rondelles épaisses et les pommes de terre en gros cubes.',
      'Referme, **Cuisson rapide 8 min**.'
    ],
    tip: 'Ajoutées en 2ᵉ temps, les pommes de terre restent entières au lieu de finir en purée.'
  },
  {
    id: 'wraps', emoji: '🌯', name: 'Poulet effiloché BBQ en wraps', tag: 'Prise de masse',
    portions: 4, time: 30, kcal: 685, p: 51, l: 17, g: 79,
    ingredients: [
      '800 g de hauts de cuisse de poulet désossés, sans peau',
      '150 g de sauce barbecue',
      '1 oignon',
      '200 ml d\'eau',
      '8 grandes tortillas de blé',
      'Salade, tomates, oignon rouge'
    ],
    steps: [
      'Mode **Dorer** : oignon émincé 2 min, puis les hauts de cuisse 2 min de chaque côté.',
      'Ajoute l\'eau et la moitié de la sauce barbecue. Racle le fond.',
      'Ferme, **Cuisson rapide 15 min**.',
      'Effiloche le poulet à la fourchette directement dans la cuve, ajoute le reste de sauce et repasse en mode **Dorer** 3 min pour faire réduire.',
      'Garnis 2 tortillas par personne avec le poulet et les crudités.'
    ],
    tip: 'Le poulet effiloché se congèle très bien : fais-en une double dose.'
  },
  {
    id: 'saumon', emoji: '🐟', name: 'Saumon, patate douce & brocolis', tag: 'Léger',
    portions: 2, time: 20, kcal: 505, p: 38, l: 17, g: 48,
    ingredients: [
      '2 pavés de saumon (2 × 125 g)',
      '400 g de patate douce',
      '300 g de brocolis',
      '200 ml d\'eau',
      'Sauce : 100 g de skyr, le jus d\'un demi-citron, aneth, sel, poivre'
    ],
    steps: [
      'Verse l\'eau dans la cuve et pose le panier vapeur.',
      'Mets la patate douce en cubes de 2 cm dans le panier, puis le saumon par-dessus. Sale et poivre.',
      'Ferme, **Cuisson rapide 5 min**.',
      'Ouvre, ajoute les brocolis en petits bouquets, referme et lance **Cuisson rapide 1 min**.',
      'Pendant ce temps, mélange le skyr, le citron et l\'aneth pour la sauce.'
    ],
    tip: 'Le plat idéal en sèche : beaucoup de protéines, des oméga-3 et presque rien à surveiller.'
  },
  {
    id: 'rizlait', emoji: '🍚', name: 'Riz au lait protéiné', tag: 'Collation',
    portions: 4, time: 30, kcal: 355, p: 22, l: 5, g: 55,
    ingredients: [
      '1 L de lait demi-écrémé',
      '150 g de riz rond',
      '50 g de sucre',
      '60 g de whey vanille (2 doses)',
      '1 gousse de vanille ou 1 c. à café d\'extrait, cannelle'
    ],
    steps: [
      'Mets le lait, le riz, le sucre et la vanille dans la cuve. Mélange bien.',
      'Ferme, **Cuisson rapide 8 min**.',
      'Laisse reposer 10 min sans ouvrir, puis mélange.',
      'Attends qu\'il soit tiède pour ajouter la whey en remuant : trop chaud, elle fait des grumeaux.',
      'Répartis dans 4 pots et garde au frigo.'
    ],
    tip: 'Avec du lait, ne dépasse jamais le repère MAX de la cuve : ça mousse sous pression.'
  }
];

// ───────── Menu de la semaine & liste de courses ─────────

// Nom court (planning) et achats par recette : [rayon, article, quantité, unité].
// Rayon « placard » : produits qu'on a en général déjà, listés sans quantité.
const EXTRA = {
  curry: { short: 'Curry coco', shop: [
    ['viande', 'Blanc de poulet', 600, 'g'], ['epicerie', 'Riz basmati', 300, 'g'], ['epicerie', 'Lait de coco léger', 400, 'ml'],
    ['surgeles', 'Petits pois', 200, 'g'], ['legumes', 'Oignons', 1, 'pc'], ['placard', 'Huile'], ['placard', 'Curry']
  ] },
  chili: { short: 'Chili', shop: [
    ['viande', 'Bœuf haché 5 %', 600, 'g'], ['epicerie', 'Riz basmati', 280, 'g'], ['epicerie', 'Haricots rouges', 1, 'boite'],
    ['epicerie', 'Tomates concassées (400 g)', 1, 'boite'], ['epicerie', 'Maïs', 1, 'boite'], ['legumes', 'Poivrons rouges', 1, 'pc'],
    ['legumes', 'Oignons', 1, 'pc'], ['placard', 'Concentré de tomate'], ['placard', 'Huile'], ['placard', 'Cumin'], ['placard', 'Paprika'], ['placard', 'Piment']
  ] },
  bolo: { short: 'Bolognaise', shop: [
    ['epicerie', 'Penne', 400, 'g'], ['viande', 'Bœuf haché 5 %', 500, 'g'], ['epicerie', 'Tomates concassées (400 g)', 1, 'boite'],
    ['epicerie', 'Coulis de tomate', 200, 'g'], ['legumes', 'Oignons', 1, 'pc'], ['legumes', 'Carottes', 100, 'g'],
    ['frais', 'Parmesan râpé', 40, 'g'], ['placard', 'Huile'], ['placard', 'Herbes de Provence']
  ] },
  risotto: { short: 'Risotto', shop: [
    ['viande', 'Blanc de poulet', 500, 'g'], ['epicerie', 'Riz arborio', 300, 'g'], ['legumes', 'Champignons de Paris', 250, 'g'],
    ['legumes', 'Oignons', 1, 'pc'], ['frais', 'Parmesan râpé', 50, 'g'], ['placard', 'Bouillon de volaille (cube)'], ['placard', 'Huile']
  ] },
  dhal: { short: 'Dhal', shop: [
    ['epicerie', 'Lentilles corail', 250, 'g'], ['viande', 'Blanc de poulet', 400, 'g'], ['epicerie', 'Riz basmati', 240, 'g'],
    ['epicerie', 'Lait de coco léger', 400, 'ml'], ['epicerie', 'Tomates concassées (400 g)', 1, 'boite'], ['legumes', 'Oignons', 1, 'pc'],
    ['legumes', 'Ail', 2, 'gousse'], ['legumes', 'Gingembre frais', 1, 'morceau'], ['legumes', 'Citrons', 1, 'pc'],
    ['placard', 'Huile'], ['placard', 'Garam masala ou curry'], ['placard', 'Curcuma'], ['placard', 'Cumin']
  ] },
  boeuf: { short: 'Bœuf carottes', shop: [
    ['viande', 'Bœuf à braiser (paleron ou joue)', 800, 'g'], ['legumes', 'Pommes de terre', 800, 'g'], ['legumes', 'Carottes', 600, 'g'],
    ['legumes', 'Oignons', 2, 'pc'], ['placard', 'Bouillon de bœuf (cube)'], ['placard', 'Farine'], ['placard', 'Concentré de tomate'],
    ['placard', 'Huile'], ['placard', 'Thym, laurier']
  ] },
  wraps: { short: 'Wraps BBQ', shop: [
    ['viande', 'Hauts de cuisse de poulet désossés', 800, 'g'], ['epicerie', 'Sauce barbecue', 150, 'g'],
    ['epicerie', 'Grandes tortillas de blé', 8, 'pc'], ['legumes', 'Oignons', 1, 'pc'], ['legumes', 'Oignons rouges', 1, 'pc'],
    ['legumes', 'Salade', 1, 'pc'], ['legumes', 'Tomates', 2, 'pc']
  ] },
  saumon: { short: 'Saumon', shop: [
    ['viande', 'Pavés de saumon', 2, 'pc'], ['legumes', 'Patate douce', 400, 'g'], ['legumes', 'Brocolis', 300, 'g'],
    ['frais', 'Skyr nature', 100, 'g'], ['legumes', 'Citrons', 1, 'pc'], ['placard', 'Aneth']
  ] },
  rizlait: { short: 'Riz au lait', shop: [
    ['frais', 'Lait demi-écrémé', 1000, 'ml'], ['epicerie', 'Riz rond', 150, 'g'], ['epicerie', 'Whey vanille', 60, 'g'],
    ['placard', 'Sucre'], ['placard', 'Vanille']
  ] }
};
RECIPES.forEach(r => Object.assign(r, EXTRA[r.id]));

export const RECIPE = Object.fromEntries(RECIPES.map(r => [r.id, r]));
// Plats de batch cooking (4 portions) qui tournent d'une semaine à l'autre
export const MAIN = RECIPES.filter(r => r.portions === 4 && r.tag !== 'Collation').map(r => r.id);
export const SUNDAY_DISH = 'saumon';

// La semaine du menu va du dimanche (jour de cuisine) au samedi
export function weekStart(todayIso) {
  const dow = new Date(todayIso + 'T12:00:00').getDay(); // 0 = dimanche
  return shiftDay(todayIso, -dow);
}

// 3 plats par défaut, qui changent chaque semaine (3 et 7 premiers entre eux : on voit tous les plats)
export function defaultPicks(sunday) {
  const w = Math.floor(daysBetween('2026-01-04', sunday) / 7); // 4 janvier 2026 = un dimanche
  const n = MAIN.length;
  const s = (((w * 3) % n) + n) % n;
  return [0, 1, 2].map(k => MAIN[(s + k) % n]);
}

// Remplace le plat n° i par le suivant de la rotation qui n'est pas déjà au menu
export function swapPick(picks, i) {
  const n = MAIN.length;
  let j = MAIN.indexOf(picks[i]);
  for (let k = 0; k < n; k++) {
    j = (j + 1) % n;
    if (!picks.includes(MAIN[j])) break;
  }
  return picks.map((id, k) => (k === i ? MAIN[j] : id));
}

// 7 jours (dimanche → samedi) : saumon frais le dimanche, puis les 3 plats en alternance.
// Lundi → mercredi au frigo, jeudi → samedi au congélateur.
export function mealPlan(sunday, picks) {
  return Array.from({ length: 7 }, (_, d) => {
    const date = shiftDay(sunday, d);
    if (d === 0) return { date, midi: SUNDAY_DISH, soir: SUNDAY_DISH, frozen: false };
    const k = (d - 1) * 2;
    return { date, midi: picks[k % 3], soir: picks[(k + 1) % 3], frozen: d >= 4 };
  });
}

export const RAYONS = [
  ['viande', 'Viandes & poissons'], ['legumes', 'Fruits & légumes'], ['frais', 'Crèmerie'],
  ['surgeles', 'Surgelés'], ['epicerie', 'Épicerie']
];

// Additionne les achats de plusieurs recettes, classés par rayon
export function shoppingList(ids) {
  const items = new Map();
  const placard = new Set();
  ids.forEach(id => RECIPE[id].shop.forEach(([rayon, label, q, u]) => {
    if (rayon === 'placard') { placard.add(label); return; }
    const key = `${rayon}|${label}|${u}`;
    const it = items.get(key) || { key, rayon, label, q: 0, u };
    it.q += q;
    items.set(key, it);
  }));
  const all = [...items.values()];
  return {
    groups: RAYONS.map(([rayon, title]) => ({
      rayon, title, items: all.filter(i => i.rayon === rayon).sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    })).filter(g => g.items.length),
    placard: [...placard].sort((a, b) => a.localeCompare(b, 'fr')),
    count: all.length
  };
}

const plural = (q, one, many) => `${q} ${q > 1 ? many : one}`;
export function fmtQty(q, u) {
  const n = x => x.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  switch (u) {
    case 'g': return q >= 1000 ? `${n(q / 1000)} kg` : `${q} g`;
    case 'ml': return q >= 1000 ? `${n(q / 1000)} L` : `${q} ml`;
    case 'boite': return plural(q, 'boîte', 'boîtes');
    case 'gousse': return plural(q, 'gousse', 'gousses');
    case 'morceau': return plural(q, 'morceau', 'morceaux');
    default: return `× ${q}`;
  }
}
