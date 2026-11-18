import { DEFAULT_WEEK } from './data.js';

const KEY = 'ich.v1';

export function mondayOf(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function isoDay(d) {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

function defaults() {
  return {
    v: 1,
    logs: [],
    overrides: {},
    week: [...DEFAULT_WEEK],
    cycleStart: isoDay(mondayOf()),
    settings: { sound: true, vibrate: true, wakelock: true },
    food: defaultFood(),
    active: null
  };
}

function defaultFood() {
  return {
    profile: { height: null, age: null, sex: 'h', goal: 'bulk' },
    kcalAdj: 0,        // ajustement cumulé proposé par les bilans de 2 semaines
    adjustedAt: null,  // date du dernier ajustement (ou changement d'objectif)
    weights: {},       // { 'AAAA-MM-JJ': kg }
    protein: {},       // { 'AAAA-MM-JJ': grammes }
    creatine: {}       // { 'AAAA-MM-JJ': true }
  };
}

// Fusionne des données sauvegardées (éventuellement anciennes) avec les valeurs par défaut
function merge(data) {
  const d = defaults();
  const f = data.food || {};
  return {
    ...d, ...data,
    settings: { ...d.settings, ...(data.settings || {}) },
    food: { ...d.food, ...f, profile: { ...d.food.profile, ...(f.profile || {}) } }
  };
}

export const S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return merge(JSON.parse(raw));
  } catch {
    return defaults();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* stockage plein ou bloqué */ }
}

export function replaceAll(data) {
  Object.keys(S).forEach(k => delete S[k]);
  Object.assign(S, merge(data));
  save();
}

export function resetAll() {
  replaceAll(defaults());
}
