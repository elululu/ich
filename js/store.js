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
    active: null
  };
}

export const S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...data, settings: { ...d.settings, ...(data.settings || {}) } };
  } catch {
    return defaults();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* stockage plein ou bloqué */ }
}

export function replaceAll(data) {
  const d = defaults();
  Object.keys(S).forEach(k => delete S[k]);
  Object.assign(S, d, data, { settings: { ...d.settings, ...(data.settings || {}) } });
  save();
}

export function resetAll() {
  replaceAll(defaults());
}
