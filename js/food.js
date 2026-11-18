// ICH !!! — Alimentation : objectifs caloriques, pesées, protéines.
// Fonctions pures, sans DOM : testables directement avec node.

export const KCAL_STEP = 150; // pas d'ajustement automatique, en kcal par jour
export const REVIEW_DAYS = 14; // un bilan toutes les 2 semaines

// Rythmes en % du poids de corps par semaine.
// aim = cible affichée, band = zone en dehors de laquelle ICH propose d'ajuster.
export const GOALS = {
  bulk: {
    label: 'Prise de masse propre', title: 'PRISE DE MASSE',
    kcal: 250, protein: 2, fat: 1,
    aim: [0.3, 0.45], band: [0.15, 0.6],
    low: 'Ça ne monte pas assez', high: 'Ça monte trop vite, c\'est surtout du gras'
  },
  maintain: {
    label: 'Maintien / recomposition', title: 'MAINTIEN',
    kcal: 0, protein: 2, fat: 1,
    aim: [-0.1, 0.1], band: [-0.25, 0.25],
    low: 'Tu perds du poids', high: 'Tu prends du poids'
  },
  cut: {
    label: 'Sèche', title: 'SÈCHE',
    kcal: -400, protein: 2.2, fat: 0.8,
    aim: [-0.75, -0.5], band: [-1, -0.25],
    low: 'Tu fonds trop vite, le muscle risque d\'y passer', high: 'Ça ne descend pas assez'
  }
};
export const goalOf = p => GOALS[p && p.goal] || GOALS.bulk;

// ───────── Dates au format AAAA-MM-JJ (calcul en UTC pour ignorer les changements d'heure)
const ms = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const shiftDay = (iso, n) => new Date(ms(iso) + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((ms(b) - ms(a)) / 864e5);

const r5 = x => Math.round(x / 5) * 5;
const r50 = x => Math.round(x / 50) * 50;

// ───────── Besoins
// Métabolisme de base (Mifflin-St Jeor)
export const bmr = (p, kg) => 10 * kg + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
// Facteur d'activité selon le nombre de séances par semaine (6 séances → 1,6)
export const activity = days => Math.min(1.65, 1.3 + 0.05 * Math.max(0, days));

export function targets(p, kg, days, adj = 0) {
  const g = goalOf(p);
  const maintenance = r50(bmr(p, kg) * activity(days) + adj);
  const kcal = maintenance + g.kcal;
  const protein = r5(kg * g.protein);
  const fat = r5(kg * g.fat);
  const carbs = Math.max(0, r5((kcal - protein * 4 - fat * 9) / 4));
  return { maintenance, kcal, protein, fat, carbs };
}

// Fourchette de rythme visée, en kg par semaine
export const aimKg = (p, kg) => goalOf(p).aim.map(pct => (kg * pct) / 100);

// ───────── Pesées : { 'AAAA-MM-JJ': kg }
export const sortedWeights = w => Object.keys(w).sort().map(d => ({ d, kg: w[d] }));

export function avgWeight(w, end, days = 7) {
  const start = shiftDay(end, -(days - 1));
  const xs = Object.keys(w).filter(d => d >= start && d <= end).map(d => w[d]);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// Poids de référence : moyenne des 7 derniers jours, sinon la dernière pesée
export function currentWeight(w, today) {
  const avg = avgWeight(w, today);
  if (avg !== null) return avg;
  const all = sortedWeights(w).filter(x => x.d <= today);
  return all.length ? all[all.length - 1].kg : null;
}

// Tendance en kg par semaine : régression linéaire sur la fenêtre (robuste aux variations d'eau)
export function trend(w, end, days = REVIEW_DAYS, from = null) {
  const start = shiftDay(end, -(days - 1));
  const pts = Object.keys(w).sort()
    .filter(d => d >= start && d <= end && (!from || d >= from))
    .map(d => ({ x: daysBetween(start, d), y: w[d] }));
  if (pts.length < 5 || pts[pts.length - 1].x - pts[0].x < 9) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, sxy = 0;
  pts.forEach(p => { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); });
  return (sxy / sxx) * 7;
}

// Bilan des 2 semaines : faut-il ajuster les calories ?
export function review(food, today) {
  const g = goalOf(food.profile);
  const first = Object.keys(food.weights).sort()[0];
  const since = food.adjustedAt || first;
  if (!since) return { wait: REVIEW_DAYS };
  const elapsed = daysBetween(since, today);
  if (elapsed < REVIEW_DAYS) return { wait: REVIEW_DAYS - elapsed };
  const rate = trend(food.weights, today, REVIEW_DAYS, since);
  if (rate === null) return { missing: true };
  const pct = (rate / currentWeight(food.weights, today)) * 100;
  const delta = pct < g.band[0] ? KCAL_STEP : pct > g.band[1] ? -KCAL_STEP : 0;
  return { rate, pct, delta, msg: delta > 0 ? g.low : delta < 0 ? g.high : '' };
}

// Données de la courbe : une entrée par jour sur la période
export function series(w, today, days = 28) {
  const start = shiftDay(today, -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const d = shiftDay(start, i);
    return { d, i, kg: w[d] ?? null, avg: avgWeight(w, d) };
  });
}

// Jours d'affilée cochés ({ 'AAAA-MM-JJ': true }), aujourd'hui compris s'il est déjà coché
export function streak(dict, today) {
  let d = dict[today] ? today : shiftDay(today, -1);
  let n = 0;
  while (dict[d]) { n++; d = shiftDay(d, -1); }
  return n;
}
