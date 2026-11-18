import { EXERCISES, SESSIONS, DAY_NAMES, DAY_SHORT, CYCLE_WEEKS, SHOUTS, REST_LINES } from './data.js';
import { S, save, mondayOf, isoDay, replaceAll, resetAll } from './store.js';
import * as sound from './sound.js';
import { RECIPES, RECIPE, BREAKFASTS, weekStart, defaultPicks, swapPick, mealPlan, shoppingList, fmtQty, SUNDAY_DISH } from './recipes.js';
import { GOALS, goalOf, targets, aimKg, sortedWeights, avgWeight, currentWeight, trend, review, series, streak, shiftDay } from './food.js';

// ───────────────────────── Utilitaires ─────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const DAY = 864e5;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const fmtKg = n => (Math.round(num(n) * 100) / 100 || 0).toLocaleString('fr-FR');
const fmtTime = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
const fmtDur = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const fmtDate = iso => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const roundTo = (x, step) => Math.round(x / step) * step;
const buzz = p => { if (S.settings.vibrate && navigator.vibrate) navigator.vibrate(p); };
const yell = () => { if (S.settings.sound) sound.shout(); };

const SMALL_INC = new Set(['lateral_raise', 'rear_delt_fly', 'cable_fly', 'face_pull', 'incline_curl', 'hammer_curl', 'pushdown']);
const BODYWEIGHT = new Set(['pullup', 'dips', 'hanging_leg_raise']);
// Charge saisie par haltère ; les haltères de salle montent en général de 2 en 2 kg
const DUMBBELL = new Set(['db_bench', 'incline_db', 'seated_db_press', 'db_row', 'shrug', 'bulgarian', 'lateral_raise', 'hammer_curl', 'rear_delt_fly', 'incline_curl']);
const incFor = id => (SMALL_INC.has(id) ? 1 : DUMBBELL.has(id) ? 2 : EXERCISES[id].lower ? 5 : 2.5);
const rir = rpe => Math.max(0, Math.round(10 - rpe));
const e1rm = s => (s.reps > 0 && s.kg > 0 ? s.kg * (1 + Math.min(s.reps, 12) / 30) : 0);

function range(reps) {
  const m = String(reps).match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return [8, 12];
  return [+m[1], m[2] ? +m[2] : +m[1]];
}

// ───────────────────────── Programme & cycle ─────────────────────────
const todayIdx = () => (new Date().getDay() + 6) % 7;
function cycleWeek() {
  const start = new Date(S.cycleStart + 'T00:00:00');
  const w = Math.round((mondayOf() - start) / (7 * DAY));
  return ((w % CYCLE_WEEKS) + CYCLE_WEEKS) % CYCLE_WEEKS + 1;
}
const isDeload = () => cycleWeek() === CYCLE_WEEKS;

function plan(sid) {
  const deload = isDeload();
  return SESSIONS[sid].exercises.map((e, i) => {
    const base = { ...e, ...(S.overrides[`${sid}:${i}`] || {}) };
    return {
      ...base, i, deload,
      sets: deload ? Math.max(2, Math.round(base.sets * 0.6)) : +base.sets,
      rest: +base.rest,
      rpe: deload ? 6 : base.rpe
    };
  });
}

function lastPerf(exId) {
  for (let i = S.logs.length - 1; i >= 0; i--) {
    const e = S.logs[i].entries.find(x => x.ex === exId);
    if (e && e.sets.length) return { date: S.logs[i].date, sets: e.sets };
  }
  return null;
}

function bestOf(exId) {
  let best = { e: 0, set: null, date: null };
  S.logs.forEach(l => l.entries.filter(x => x.ex === exId).forEach(x => x.sets.forEach(s => {
    const v = e1rm(s);
    if (v > best.e) best = { e: v, set: s, date: l.date };
  })));
  return best;
}

function suggest(p) {
  const [lo, hi] = range(p.reps);
  const last = lastPerf(p.ex);
  const inc = incFor(p.ex);
  if (!last) return { kg: null, text: `1ʳᵉ fois : prends une charge qui te laisse <b>${rir(p.rpe)} rep${rir(p.rpe) > 1 ? 's' : ''} en réserve</b> (RPE ${p.rpe}).` };
  const top = Math.max(...last.sets.map(s => num(s.kg) || 0));
  const work = last.sets.filter(s => (num(s.kg) || 0) === top);
  if (p.deload) return { kg: top ? roundTo(top * 0.9, inc) : top, text: 'Semaine <b>DELOAD</b> : −10 % de charge, moins de séries, technique parfaite.' };
  if (work.every(s => +s.reps >= hi)) {
    if (BODYWEIGHT.has(p.ex) && top === 0 && p.ex === 'hanging_leg_raise') return { kg: 0, up: true, text: 'Toutes les reps au max → ralentis la descente (4 s). ICH !' };
    return { kg: top + inc, up: true, text: `Toutes tes reps au max la dernière fois → <b>+${fmtKg(inc)} kg${DUMBBELL.has(p.ex) ? ' par haltère' : ''}</b>. ICH !` };
  }
  if (work.some(s => +s.reps < lo)) return { kg: top, text: `Même charge, vise au moins <b>${lo} reps</b> sur chaque série.` };
  return { kg: top, text: `Même charge, gratte <b>+1 rep</b> par série jusqu'à ${hi}.` };
}

function warmup(p, kg) {
  if (p.i !== 0 || p.rest < 150) return '';
  if (DUMBBELL.has(p.ex)) {
    if (!(kg >= 14)) return '';
    const steps = [[0.4, 10], [0.6, 6], [0.8, 3]].map(([pct, r]) => `${fmtKg(Math.max(2, roundTo(kg * pct, 2)))}×${r}`);
    return `<div class="hint warm">🔥 Échauffement (kg/haltère) : <b>${steps.join(' · ')}</b></div>`;
  }
  if (!(kg >= 40)) return '';
  const steps = [[0.4, 5], [0.6, 3], [0.8, 2]].map(([pct, r]) => `${fmtKg(Math.max(20, roundTo(kg * pct, 2.5)))}×${r}`);
  return `<div class="hint warm">🔥 Échauffement : <b>barre×10 · ${steps.join(' · ')}</b></div>`;
}

const estMinutes = p => Math.round(p.reduce((t, x) => t + x.sets * (45 + x.rest), 0) / 60);

// ───────────────────────── Alimentation : helpers ─────────────────────────
const todayIso = () => isoDay(new Date());
const trainingDays = () => S.week.filter(x => SESSIONS[x]).length;
const foodReady = () => S.food.profile.height > 0 && S.food.profile.age > 0 && Object.keys(S.food.weights).length > 0;
const fmtNum = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.abs(n), d);
const fmtInt = n => Math.round(n).toLocaleString('fr-FR');
const fmtDay = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

function foodNow() {
  const today = todayIso();
  const f = S.food;
  const kg = currentWeight(f.weights, today);
  return { today, f, kg, t: targets(f.profile, kg, trainingDays(), f.kcalAdj) };
}

function aimText(p, kg) {
  const [lo, hi] = aimKg(p, kg).map(Math.abs);
  if (p.goal === 'maintain') return `poids stable, à ${fmtNum(hi)} kg près par semaine`;
  return p.goal === 'cut' ? `−${fmtNum(hi)} à −${fmtNum(lo)} kg par semaine` : `+${fmtNum(lo)} à +${fmtNum(hi)} kg par semaine`;
}
const goalOptions = sel => Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${g.label}</option>`).join('');
const sexOptions = sel => [['h', 'Homme'], ['f', 'Femme']].map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${l}</option>`).join('');

function doneDaysThisWeek() {
  const mon = mondayOf().getTime();
  const days = new Set();
  S.logs.forEach(l => { const t = new Date(l.date); if (t >= mon) days.add((t.getDay() + 6) % 7); });
  return days;
}

// ───────────────────────── Vues ─────────────────────────
function topbar() {
  const w = cycleWeek();
  return `<header class="topbar">
    <h1 class="logo">ICH<span>!!!</span></h1>
    <span class="cycle-chip ${w === CYCLE_WEEKS ? 'deload' : ''}">${w === CYCLE_WEEKS ? `DELOAD · S${w}/${CYCLE_WEEKS}` : `SEMAINE ${w}/${CYCLE_WEEKS}`}</span>
  </header>`;
}

function weekStrip() {
  const t = todayIdx();
  const done = doneDaysThisWeek();
  return `<div class="week-strip">${S.week.map((sid, i) => {
    const s = SESSIONS[sid];
    return `<div class="day-pill t-${s ? s.type : 'rest'} ${i === t ? 'today' : ''} ${done.has(i) ? 'done' : ''}">${DAY_SHORT[i]}<b>${s ? s.title.replace(' ', '') : 'OFF'}</b></div>`;
  }).join('')}</div>`;
}

function viewToday() {
  const idx = todayIdx();
  const sid = S.week[idx];
  const s = SESSIONS[sid];
  const hour = new Date().getHours();
  const hello = hour < 11 ? 'Debout, la fonte t\'attend' : hour < 18 ? 'L\'après-midi, c\'est pour soulever' : 'Séance du soir, bonsoir les PR';
  let card;
  if (!s) {
    card = `<section class="panel today t-rest">
      <div class="today-head"><div class="today-day">${DAY_NAMES[idx]}</div><div class="today-title">REPOS</div><div class="today-sub">Mange. Dors. Grandis.</div></div>
      <div class="today-body">
        <p style="margin-top:0;font-weight:600">Le muscle pousse quand tu te reposes. ICH ordonne : 8 h de sommeil et 2 g de protéines par kilo.</p>
        <a class="btn block" href="#/week">Bosser quand même → choisir une séance</a>
      </div></section>`;
  } else {
    const p = plan(sid);
    const already = doneDaysThisWeek().has(idx);
    const active = S.active && S.active.sid === sid;
    card = `<section class="panel today t-${s.type}">
      <div class="today-head"><div class="today-day">${DAY_NAMES[idx]} · aujourd'hui</div><div class="today-title">${s.title}</div><div class="today-sub">${esc(s.subtitle)}</div></div>
      <div class="today-body">
        <div class="meta">
          <span class="tag accent">${p.length} exos</span>
          <span class="tag">${p.reduce((n, x) => n + x.sets, 0)} séries</span>
          <span class="tag">≈ ${estMinutes(p)} min</span>
          ${p[0].deload ? '<span class="tag">DELOAD</span>' : ''}
          ${already ? '<span class="tag" style="background:#DFFFE9">✓ Fait</span>' : ''}
        </div>
        <ul class="ex-mini">${p.map(x => `<li><span>${esc(EXERCISES[x.ex].name)}</span><span>${x.sets}×${x.reps}</span></li>`).join('')}</ul>
        <button class="btn big" data-act="start" data-sid="${sid}">${active ? 'REPRENDRE ! ICH !' : already ? 'ENCORE ? ICH !!!' : 'C\'EST PARTI ! ICH !!!'}</button>
        <a class="btn block sm" style="margin-top:10px" href="#/session/${sid}">Voir le détail de la séance</a>
      </div></section>`;
  }
  return `${topbar()}
    <section class="hero">
      <img class="hero-mascot" id="heroMascot" data-act="shout" src="img/mascot.png" alt="La mascotte ICH, un bodybuilder qui hurle">
      <div class="bubble" id="heroBubble">ICH !!!<small>${hello}</small></div>
    </section>
    ${card}
    ${foodMini()}
    <h2 class="section">CETTE SEMAINE</h2>
    ${weekStrip()}`;
}

// Rappel protéines + pesée sur l'écran du jour
function foodMini() {
  if (!foodReady()) return `<a class="panel food-mini t-food" href="#/food"><span>🍗 Calcule tes calories et tes protéines</span><span class="chev">›</span></a>`;
  const { today, f, t } = foodNow();
  const prot = f.protein[today] || 0;
  const w = f.weights[today];
  return `<a class="panel food-mini t-food" href="#/food">
    <span>🍗 <b>${prot}/${t.protein} g</b> protéines</span>
    <span>⚖️ <b>${w !== undefined ? `${fmtNum(w)} kg` : 'Pèse-toi !'}</b></span>
    <span class="chev">›</span>
  </a>`;
}

function viewWeek() {
  const t = todayIdx();
  const done = doneDaysThisWeek();
  const options = sel => [...Object.values(SESSIONS).map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${s.title}</option>`), `<option value="rest" ${sel === 'rest' ? 'selected' : ''}>Repos</option>`].join('');
  return `${topbar()}
    <h2 class="section" style="margin-top:6px">PROGRAMME DE LA SEMAINE</h2>
    <div class="day-list">${S.week.map((sid, i) => {
      const s = SESSIONS[sid];
      const p = s ? plan(sid) : [];
      return `<div class="panel day-card t-${s ? s.type : 'rest'} ${i === t ? 'is-today' : ''}">
        <div class="dname">${DAY_SHORT[i]}${done.has(i) ? '<br>✓' : ''}</div>
        <div>
          ${s ? `<a href="#/session/${sid}" style="text-decoration:none;color:inherit"><h3>${s.title}</h3><p>${esc(s.subtitle)} · ${p.length} exos · ≈${estMinutes(p)} min</p></a>` : '<h3>REPOS</h3><p>Récup, bouffe, dodo.</p>'}
          <select data-day="${i}" aria-label="Séance du ${DAY_NAMES[i]}">${options(sid)}</select>
        </div>
        ${s ? `<a class="chev" href="#/session/${sid}" style="text-decoration:none;color:inherit">›</a>` : '<span></span>'}
      </div>`;
    }).join('')}</div>
    <h2 class="section">LE CYCLE ICH</h2>
    <div class="panel">
      <p style="margin:0 0 8px;font-weight:700">Cycle de ${CYCLE_WEEKS} semaines, double progression :</p>
      <ul class="cues">
        <li>S1 → S4 : quand tu atteins le haut de la fourchette de reps sur toutes les séries, l'app te propose d'ajouter de la charge.</li>
        <li>S${CYCLE_WEEKS} : DELOAD — séries ×0,6, charge −10 %, RPE 6. Le corps encaisse, puis on repart plus fort.</li>
        <li>PPL ×2 : chaque muscle est travaillé 2 fois par semaine (A = force, B = hypertrophie).</li>
      </ul>
    </div>`;
}

let editing = false;
function viewSession(sid) {
  const s = SESSIONS[sid];
  if (!s) return viewToday();
  const p = plan(sid);
  const restOpts = v => [30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300].map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${fmtTime(x)}</option>`).join('');
  return `<div class="t-${s.type}">
    <a class="back" href="#/week">← Semaine</a>
    <div class="sess-head"><h1>${s.title}</h1><p>${esc(s.subtitle)} · ≈ ${estMinutes(p)} min${p[0].deload ? ' · DELOAD' : ''}</p></div>
    <div class="row" style="margin-bottom:16px">
      <button class="btn grow ${editing ? 'ink' : ''}" data-act="edit">${editing ? '✓ Terminé' : '✎ Modifier séries / repos'}</button>
      ${editing ? `<button class="btn" data-act="reset-ov" data-sid="${sid}">Réinitialiser</button>` : ''}
    </div>
    <div class="ex-list ${editing ? 'editing' : ''}">${p.map(x => {
      const ex = EXERCISES[x.ex];
      const base = { ...SESSIONS[sid].exercises[x.i], ...(S.overrides[`${sid}:${x.i}`] || {}) };
      return `<article class="panel ex-card">
        <span class="ex-num">${x.i + 1}</span>
        <img class="ex-thumb" loading="lazy" src="gif/${ex.gif}.gif" alt="" onerror="this.src='img/mascot.png'" data-act="info" data-ex="${x.ex}">
        <div data-act="info" data-ex="${x.ex}">
          <h3>${esc(ex.name)}</h3>
          <div class="musc">${esc(ex.muscles)}</div>
          <div class="presc">
            <span class="tag accent">${x.sets} × ${esc(x.reps)}</span>
            <span class="tag">RPE ${x.rpe}</span>
            <span class="tag">⏱ ${fmtTime(x.rest)}</span>
            <span class="tag">${esc(x.tempo)}</span>
          </div>
          ${x.note ? `<div class="ex-note">⚡ ${esc(x.note)}</div>` : ''}
        </div>
        <div class="edit-row">
          <label>Séries<input type="number" min="1" max="10" inputmode="numeric" value="${base.sets}" data-ov="${sid}:${x.i}:sets"></label>
          <label>Reps<input type="text" value="${esc(base.reps)}" data-ov="${sid}:${x.i}:reps"></label>
          <label>Repos<select data-ov="${sid}:${x.i}:rest">${restOpts(+base.rest)}</select></label>
        </div>
      </article>`;
    }).join('')}</div>
    <div style="margin-top:20px"><button class="btn big" data-act="start" data-sid="${sid}">${S.active && S.active.sid === sid ? 'REPRENDRE ! ICH !' : 'LANCER ! ICH !!!'}</button></div>
  </div>`;
}

function viewWorkout() {
  const A = S.active;
  if (!A) { location.hash = '#/'; return ''; }
  const s = SESSIONS[A.sid];
  const p = A.plan[A.cur];
  const ex = EXERCISES[p.ex];
  const entry = A.entries[A.cur];
  const bw = BODYWEIGHT.has(p.ex);
  const total = A.entries.reduce((n, e) => n + e.sets.length, 0);
  const done = A.entries.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0);
  const allDone = done === total;
  const sg = suggest(p);
  const last = lastPerf(p.ex);
  const firstKg = num(entry.sets[0]?.kg);
  return `<div class="t-${s.type}">
    <div class="wk-top">
      <a class="back" href="#/">←</a>
      <h1 class="wk-title">${s.title}</h1>
      <span class="wk-clock" id="wkClock">${fmtTime((Date.now() - A.startedAt) / 1000)}</span>
    </div>
    <div class="progress" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}"><i style="width:${(done / total) * 100}%"></i></div>
    <div class="chips">${A.plan.map((q, i) => {
      const e = A.entries[i];
      const d = e.sets.filter(x => x.done).length;
      return `<button class="chip ${i === A.cur ? 'cur' : ''} ${d === e.sets.length ? 'complete' : ''}" data-act="goto" data-i="${i}"><span>${i + 1}. ${esc(EXERCISES[q.ex].name)}</span><small>${d}/${e.sets.length} séries</small></button>`;
    }).join('')}</div>
    <section class="panel wk-card">
      <div class="wk-gif">
        <span class="ex-count">${A.cur + 1}/${A.plan.length}</span>
        <img src="gif/${ex.gif}.gif" alt="Démo animée : ${esc(ex.name)}" onerror="this.src='img/mascot.png'">
        <button class="btn sm info-btn" data-act="info" data-ex="${p.ex}">ⓘ Technique</button>
      </div>
      <div class="wk-body">
        <h2>${esc(ex.name)}</h2>
        <div class="target">
          <span class="tag accent">${entry.sets.length} × ${esc(p.reps)}</span>
          <span class="tag">RPE ${p.rpe}</span>
          <span class="tag">Tempo ${esc(p.tempo)}</span>
          <span class="tag">⏱ ${fmtTime(p.rest)}</span>
        </div>
        ${p.note ? `<div class="hint warm">⚡ ${esc(p.note)}</div>` : ''}
        ${last ? `<div class="hint">📒 Dernière fois (${fmtDate(last.date)}) : <b>${last.sets.map(x => `${fmtKg(x.kg)}×${x.reps}`).join(' · ')}</b></div>` : ''}
        <div class="hint ${sg.up ? 'go' : ''}">🎯 ${sg.text}</div>
        ${warmup(p, firstKg)}
        <div class="sets">
          <div class="set-head"><span>#</span><span>${bw ? 'Lest kg' : DUMBBELL.has(p.ex) ? 'kg/haltère' : 'kg'}</span><span></span><span>Reps</span><span></span></div>
          ${entry.sets.map((st, i) => `<div class="set-row ${st.done ? 'done' : ''}" data-i="${i}">
            <span class="set-n">${i + 1}</span>
            <input class="kg" data-f="kg" inputmode="decimal" enterkeyhint="next" value="${esc(st.kg)}" placeholder="${bw ? '0' : 'kg'}" aria-label="Charge série ${i + 1}">
            <span class="x">×</span>
            <input class="reps" data-f="reps" inputmode="numeric" enterkeyhint="done" value="${esc(st.reps)}" placeholder="${esc(p.reps)}" aria-label="Répétitions série ${i + 1}">
            <button class="check" data-act="set" data-i="${i}" aria-label="Valider la série ${i + 1}">✓</button>
          </div>`).join('')}
        </div>
        <div class="set-tools">
          <button class="btn sm" data-act="add-set">+ Série</button>
          <button class="btn sm" data-act="del-set" ${entry.sets.length <= 1 ? 'disabled' : ''}>− Série</button>
        </div>
      </div>
    </section>
    <div class="wk-nav">
      <button class="btn" data-act="prev" ${A.cur === 0 ? 'disabled' : ''}>← Exo préc.</button>
      <button class="btn" data-act="next" ${A.cur === A.plan.length - 1 ? 'disabled' : ''}>Exo suiv. →</button>
    </div>
    <div style="margin-top:14px">${allDone
      ? '<button class="btn big" data-act="finish">TERMINER ! ICH !!!</button>'
      : '<button class="btn block" data-act="finish">🏁 Terminer la séance</button>'}</div>
    <button class="btn ghost block small" data-act="abandon" style="margin-top:8px">Abandonner la séance</button>
  </div>`;
}

let justFinished = null;
function viewDone(id) {
  const l = S.logs.find(x => x.id === id);
  if (!l) return viewHistory();
  const s = SESSIONS[l.sid];
  return `<div class="t-${s ? s.type : 'push'}">
    <section class="done-hero">
      <img src="img/mascot_win.png" alt="La mascotte ICH brandit un haltère en or">
      <h1>ICH !!!<br>TERMINÉ</h1>
      <p style="font-weight:800;margin:10px 0 16px">${s ? s.title : ''} pliée en ${fmtDur(l.duration)}. Respect.</p>
    </section>
    <div class="stats">
      <div class="panel stat"><b>${l.sets}</b><span>séries</span></div>
      <div class="panel stat"><b>${(l.volume / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t</b><span>soulevées</span></div>
      <div class="panel stat"><b>${l.prs.length}</b><span>records</span></div>
    </div>
    ${l.prs.length ? `<h2 class="section">NOUVEAUX RECORDS</h2><div class="pr-list">${l.prs.map(exId => { const b = bestOf(exId); return `<div class="panel pr"><span>${esc(EXERCISES[exId].name)} <span class="pr-badge">PR</span></span><b>${fmtKg(b.set.kg)} × ${b.set.reps}</b></div>`; }).join('')}</div>` : ''}
    <h2 class="section">DÉTAIL</h2>
    <div class="panel log-body" style="border-top:var(--line) solid var(--ink)">${logRows(l)}</div>
    <div style="margin-top:18px"><a class="btn big" href="#/" style="background:var(--ink);color:var(--yellow)">RETOUR</a></div>
  </div>`;
}

function logRows(l) {
  return l.entries.map(e => `<div><span><b>${esc(EXERCISES[e.ex]?.name || e.ex)}</b></span><span>${e.sets.map(x => `${fmtKg(x.kg)}×${x.reps}`).join(' · ')}</span></div>`).join('');
}

// ───────────────────────── Courbes de progression ─────────────────────────
// Type de séance de chaque exercice (couleur de la courbe), d'après le programme
const EX_TYPE = {};
Object.values(SESSIONS).forEach(s => s.exercises.forEach(e => { EX_TYPE[e.ex] ??= s.type; }));
const CURVE_MODES = {
  e1rm: { label: '1RM estimé', unit: 'kg' },
  bw: { label: '1RM estimé en lest', unit: 'kg' },
  reps: { label: 'Reps max', unit: 'reps' }
};
let curveEx = null;   // exercice affiché (choix gardé le temps de la session)
let curve = null;     // données du graphique pour le survol

// Poids de corps à une date : la dernière pesée avant, sinon la première pesée
function bodyweightAt(day) {
  const days = Object.keys(S.food.weights).sort();
  if (!days.length) return null;
  let pick = days[0];
  for (const d of days) { if (d <= day) pick = d; else break; }
  return S.food.weights[pick];
}

function curveMode(id) {
  if (id === 'hanging_leg_raise') return 'reps';
  if (BODYWEIGHT.has(id)) return Object.keys(S.food.weights).length ? 'bw' : 'reps';
  return 'e1rm';
}

// Un point par séance (hors deload) : la meilleure série selon le mode
function curvePoints(id, mode) {
  const pts = [];
  S.logs.filter(l => !l.deload).forEach(l => l.entries.filter(e => e.ex === id).forEach(e => {
    const d = isoDay(new Date(l.date));
    const bw = mode === 'bw' ? bodyweightAt(d) : 0;
    let y = 0, top = null;
    e.sets.forEach(s => {
      const v = mode === 'reps' ? s.reps
        : mode === 'bw' ? (bw + s.kg) * (1 + Math.min(s.reps, 12) / 30) - bw // charge totale estimée moins le poids de corps
        : e1rm(s);
      if (s.reps > 0 && v > y) { y = v; top = s; }
    });
    if (top) pts.push({ t: new Date(l.date).getTime(), d, y, s: top });
  }));
  return pts.sort((a, b) => a.t - b.t);
}

// Arrondi au kilo, comme la liste des records
const fmtCurve = v => Math.round(v).toLocaleString('fr-FR');

function curveReadout(p) {
  const { mode } = curve;
  const set = mode === 'reps' ? `${p.s.reps} reps` : `${mode === 'bw' ? 'lest ' : ''}${fmtKg(p.s.kg)} kg × ${p.s.reps}`;
  return `${fmtDay(p.d)} · <b>${fmtCurve(p.y)} ${CURVE_MODES[mode].unit}</b> · meilleure série : ${set}`;
}

function curveChart(pts, mode) {
  const W = 320, H = 150, L = 34, R = 44, T = 10, B = 22;
  if (pts.length < 2) { curve = null; return '<p class="small muted" style="margin:12px 0 0">La courbe apparaît après 2 séances sur cet exercice.</p>'; }
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const ys = pts.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const step = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].find(s => s >= Math.max(hi - lo, 1) / 4) || 100;
  lo = Math.max(0, Math.floor((lo - step * 0.3) / step) * step);
  hi = Math.ceil((hi + step * 0.3) / step) * step;
  const x = t => L + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - L - R);
  const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  const last = pts[pts.length - 1];
  curve = { pts, x, y, mode, last, W };
  return `<div class="chart-read" id="cRead">${curveReadout(last)}</div>
    <svg class="wchart" id="cChart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${CURVE_MODES[mode].label} de chaque séance. Dernière valeur : ${fmtCurve(last.y)} ${CURVE_MODES[mode].unit}.">
      ${ticks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ax" x="${L - 6}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end">${fmtNum(v, step < 1 ? 1 : 0)}</text>`).join('')}
      <text class="ax" x="${L}" y="${H - 6}">${fmtShort(pts[0].d)}</text>
      <text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">${fmtShort(last.d)}</text>
      <line class="xh" id="cXh" y1="${T}" y2="${H - B}" style="display:none"/>
      <path class="avg" d="${pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join('')}"/>
      ${pts.slice(0, -1).map(p => `<circle class="end" cx="${x(p.t).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="4"/>`).join('')}
      <circle class="end" cx="${x(last.t).toFixed(1)}" cy="${y(last.y).toFixed(1)}" r="5"/>
      <text class="lbl" x="${(x(last.t) + 9).toFixed(1)}" y="${(y(last.y) + 4).toFixed(1)}">${fmtCurve(last.y)}</text>
      <circle class="focus" id="cFocus" r="5.5" style="display:none"/>
    </svg>`;
}

function bindCurve() {
  const svg = $('#cChart');
  if (!svg || !curve) return;
  const read = $('#cRead'), xh = $('#cXh'), focus = $('#cFocus');
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const vx = ((ev.clientX - r.left) / r.width) * curve.W;
    const p = curve.pts.reduce((a, b) => (Math.abs(curve.x(b.t) - vx) < Math.abs(curve.x(a.t) - vx) ? b : a));
    const cx = curve.x(p.t).toFixed(1);
    xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.style.display = '';
    focus.setAttribute('cx', cx); focus.setAttribute('cy', curve.y(p.y).toFixed(1)); focus.style.display = '';
    read.innerHTML = curveReadout(p);
  };
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', () => { xh.style.display = 'none'; focus.style.display = 'none'; read.innerHTML = curveReadout(curve.last); });
}

function curveSection() {
  const sessions = id => S.logs.filter(l => !l.deload && l.entries.some(e => e.ex === id)).length;
  const ids = Object.keys(EXERCISES).filter(id => sessions(id) > 0);
  if (!ids.length) return '';
  if (!ids.includes(curveEx)) curveEx = ids.reduce((a, b) => (sessions(b) > sessions(a) ? b : a));
  const mode = curveMode(curveEx);
  const pts = curvePoints(curveEx, mode);
  const M = CURVE_MODES[mode];
  const groups = [['push', 'PUSH'], ['pull', 'PULL'], ['legs', 'LEGS'], [undefined, 'AUTRES']].map(([type, label]) => {
    const opts = ids.filter(id => EX_TYPE[id] === type);
    return opts.length ? `<optgroup label="${label}">${opts.map(id => `<option value="${id}" ${id === curveEx ? 'selected' : ''}>${esc(EXERCISES[id].name)} (${sessions(id)})</option>`).join('')}</optgroup>` : '';
  }).join('');
  let stats = '', hint = '';
  if (pts.length >= 2) {
    const first = pts[0].y, last = pts[pts.length - 1].y, best = Math.max(...pts.map(p => p.y));
    const diff = last - first;
    stats = `<div class="stats sm">
      <div class="panel stat"><b>${fmtCurve(first)}</b><span>départ</span></div>
      <div class="panel stat"><b>${fmtCurve(best)}</b><span>record</span></div>
      <div class="panel stat"><b>${diff >= 0 ? '+' : '−'}${fmtCurve(Math.abs(diff))}</b><span>${first > 0 ? `${diff >= 0 ? '+' : '−'}${Math.round(Math.abs(diff) / first * 100)} %` : M.unit}</span></div>
    </div>`;
    const before = Math.max(...pts.slice(0, -1).map(p => p.y));
    if (last > before + 0.01) hint = '<div class="hint go" style="margin-top:12px">🏆 Record battu à la dernière séance. ICH&nbsp;!</div>';
    else if (pts.length >= 4 && Math.max(...pts.slice(-3).map(p => p.y)) <= Math.max(...pts.slice(0, -3).map(p => p.y)) + 0.01) {
      hint = '<div class="hint warm" style="margin-top:12px">😐 Pas de record depuis 3 séances. Ça arrive ; si ça dure, regarde ton sommeil et tes calories (onglet BOUFFE) avant de changer d\'exercice.</div>';
    }
  }
  return `<h2 class="section">COURBES</h2>
    <div class="panel curve t-${EX_TYPE[curveEx] || 'push'}">
      <select class="curve-select" data-curve aria-label="Exercice affiché">${groups}</select>
      <p class="small muted" style="margin:8px 0 0">${M.label} (${M.unit}) : la meilleure série de chaque séance${mode === 'bw' ? ', calculée avec ton poids de corps' : ''}. Semaines de deload exclues.</p>
      ${curveChart(pts, mode)}
      ${stats}
      ${hint}
    </div>`;
}

function viewHistory() {
  const mon = mondayOf().getTime();
  const thisWeek = S.logs.filter(l => new Date(l.date) >= mon);
  const planned = S.week.filter(x => SESSIONS[x]).length;
  const vol = thisWeek.reduce((t, l) => t + l.volume, 0);
  const records = Object.keys(EXERCISES).filter(id => !BODYWEIGHT.has(id)).map(id => ({ id, ...bestOf(id) })).filter(r => r.e > 0).sort((a, b) => b.e - a.e);
  return `${topbar()}
    <h2 class="section" style="margin-top:6px">TES PROGRÈS</h2>
    <div class="stats">
      <div class="panel stat"><b>${thisWeek.length}/${planned}</b><span>cette semaine</span></div>
      <div class="panel stat"><b>${(vol / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t</b><span>volume sem.</span></div>
      <div class="panel stat"><b>${S.logs.length}</b><span>séances</span></div>
    </div>
    ${S.logs.length === 0 ? `<div class="panel empty" style="margin-top:18px"><img src="img/mascot_rest.png" alt=""><p style="font-weight:800;margin:0">Rien ici encore.<br>Va soulever un truc lourd. ICH !</p></div>` : ''}
    ${curveSection()}
    ${records.length ? `<h2 class="section">RECORDS (1RM ESTIMÉ)</h2><div class="pr-list">${records.slice(0, 10).map(r => `<div class="panel pr"><span>${esc(EXERCISES[r.id].name)}<br><small class="muted">${fmtKg(r.set.kg)} kg × ${r.set.reps} · ${fmtDate(r.date)}</small></span><b>${fmtKg(Math.round(r.e))} kg</b></div>`).join('')}</div>` : ''}
    ${S.logs.length ? `<h2 class="section">JOURNAL</h2><div class="pr-list">${[...S.logs].reverse().slice(0, 40).map(l => { const s = SESSIONS[l.sid]; return `<details class="panel log t-${s ? s.type : 'push'}">
        <summary><i></i><div><h3>${s ? s.title : esc(l.sid)}${l.prs.length ? ' <span class="pr-badge">PR</span>' : ''}</h3><p>${fmtDate(l.date)} · ${fmtDur(l.duration)} · ${l.sets} séries${l.deload ? ' · deload' : ''}</p></div><span class="vol">${(l.volume / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t</span></summary>
        <div class="log-body">${logRows(l)}<button class="btn sm" data-act="del-log" data-id="${l.id}" style="justify-self:start">Supprimer</button></div>
      </details>`; }).join('')}</div>` : ''}`;
}

function viewSettings() {
  const w = cycleWeek();
  const sw = (k, label, sub) => `<div class="set-item"><span>${label}<small>${sub}</small></span><label class="switch"><input type="checkbox" data-setting="${k}" ${S.settings[k] ? 'checked' : ''}><span></span></label></div>`;
  return `${topbar()}
    <h2 class="section" style="margin-top:6px">RÉGLAGES</h2>
    <div class="panel set-list">
      ${sw('sound', 'Cri « ICH !!! »', 'À la fin de chaque repos')}
      ${sw('vibrate', 'Vibrations', 'Android uniquement (iOS ne vibre pas en web)')}
      ${sw('wakelock', 'Écran toujours allumé', 'Pendant la séance')}
      <div class="set-item"><span>Semaine du cycle<small>Semaine ${CYCLE_WEEKS} = deload</small></span>
        <select data-cycle>${Array.from({ length: CYCLE_WEEKS }, (_, i) => `<option value="${i + 1}" ${i + 1 === w ? 'selected' : ''}>S${i + 1}${i + 1 === CYCLE_WEEKS ? ' · deload' : ''}</option>`).join('')}</select></div>
      <div class="set-item"><span>Tester le cri<small>Monte le son 🔊</small></span><button class="btn sm accent" style="--accent:var(--red)" data-act="test-shout">ICH !!!</button></div>
    </div>
    <h2 class="section">DONNÉES</h2>
    <div class="panel set-list">
      <div class="set-item"><span>Exporter<small>Sauvegarde JSON de tout ton historique</small></span><button class="btn sm" data-act="export">Exporter</button></div>
      <div class="set-item"><span>Importer<small>Remplace les données actuelles</small></span><label class="btn sm">Importer<input type="file" accept="application/json,.json" data-import hidden></label></div>
      <div class="set-item"><span>Tout effacer<small>Historique, pesées, réglages, séance en cours</small></span><button class="btn sm" data-act="reset" style="background:var(--red);color:#fff">Effacer</button></div>
    </div>
    <h2 class="section">INSTALLER L'APP</h2>
    <div class="panel">
      <ul class="cues" style="margin:0">
        <li><span><b>iPhone</b> : Safari → bouton Partager → « Sur l'écran d'accueil ».</span></li>
        <li><span><b>Android</b> : Chrome → menu ⋮ → « Installer l'application ».</span></li>
        <li><span>Une fois installée, l'app marche hors ligne, même au fond de la salle sans réseau.</span></li>
      </ul>
    </div>
    <p class="small muted" style="text-align:center;margin-top:18px">ICH!!! v1 · tout reste sur ton téléphone</p>`;
}

// ───────────────────────── Alimentation ─────────────────────────
function viewFoodSetup() {
  const p = S.food.profile;
  return `${topbar()}
    <section class="panel today t-food" style="margin-top:6px">
      <div class="today-head"><div class="today-day">Alimentation</div><div class="today-title">À TABLE !</div><div class="today-sub">Le muscle se construit à la salle et se paie à table.</div></div>
      <div class="today-body">
        <p style="margin-top:0;font-weight:600">Donne 5 infos : ICH calcule tes calories et tes macros, puis les ajuste toutes les 2 semaines d'après ta courbe de poids.</p>
        <div class="food-form">
          <label>Taille (cm)<input id="fHeight" inputmode="numeric" placeholder="175" value="${p.height || ''}"></label>
          <label>Poids ce matin (kg)<input id="fWeight" inputmode="decimal" placeholder="70,0"></label>
          <label>Âge<input id="fAge" inputmode="numeric" placeholder="25" value="${p.age || ''}"></label>
          <label>Sexe<select id="fSex">${sexOptions(p.sex)}</select></label>
          <label class="full">Objectif<select id="fGoal">${goalOptions(p.goal)}</select></label>
        </div>
        <button class="btn big" data-act="food-setup">CALCULER ! ICH !!!</button>
      </div>
    </section>`;
}

function reviewCard(rv, p, kg) {
  if (rv.wait) return `<div class="hint">🗓️ Prochain bilan automatique dans <b>${rv.wait} jour${rv.wait > 1 ? 's' : ''}</b>. Pèse-toi chaque matin : ICH ajustera tes calories d'après ta courbe.</div>`;
  if (rv.missing) return `<div class="hint">⚖️ Pas assez de pesées sur les 14 derniers jours pour faire le bilan : il en faut au moins 5, étalées sur 10 jours.</div>`;
  const rate = `<b>${signed(rv.rate, 2)} kg/sem</b> sur 14 jours`;
  if (!rv.delta) {
    const [lo, hi] = goalOf(p).aim;
    if (rv.pct >= lo && rv.pct <= hi) return `<div class="hint go">✅ Rythme parfait : ${rate}. On ne touche à rien. ICH !</div>`;
    return `<div class="hint go">👌 Rythme correct : ${rate} (objectif ${aimText(p, kg)}). Pas besoin de toucher aux calories pour l'instant.</div>`;
  }
  return `<div class="hint warm">${rv.delta > 0 ? '🍽️' : '✂️'} ${esc(rv.msg)} : ${rate} (objectif ${aimText(p, kg)}). ICH propose <b>${signed(rv.delta, 0)} kcal par jour</b>.
    <div class="row" style="margin-top:8px;flex-wrap:wrap">
      <button class="btn sm ink" data-act="food-apply" data-delta="${rv.delta}">Appliquer ${signed(rv.delta, 0)} kcal</button>
      <button class="btn sm" data-act="food-skip">Pas cette fois</button>
    </div></div>`;
}

// Courbe de poids sur 4 semaines : pesées (points) + moyenne glissante sur 7 jours (ligne)
const CH = { W: 320, H: 150, L: 34, R: 40, T: 10, B: 22, days: 28 };
let chart = null;

function chartReadout(p) {
  return `${fmtDay(p.d)} · pesée <b>${p.kg !== null ? `${fmtNum(p.kg)} kg` : '—'}</b> · moyenne 7 j <b>${p.avg !== null ? `${fmtNum(p.avg)} kg` : '—'}</b>`;
}

function weightChart(today) {
  const pts = series(S.food.weights, today, CH.days);
  if (pts.filter(p => p.kg !== null).length < 2) { chart = null; return '<p class="small muted" style="margin:14px 0 0">La courbe apparaît dès la 2ᵉ pesée.</p>'; }
  const { W, H, L, R, T, B } = CH;
  const vals = pts.flatMap(p => [p.kg, p.avg]).filter(v => v !== null);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const step = hi - lo <= 1.5 ? 0.5 : hi - lo <= 4 ? 1 : 2;
  lo = Math.floor((lo - 0.2) / step) * step;
  hi = Math.ceil((hi + 0.2) / step) * step;
  const dx = (W - L - R) / (CH.days - 1);
  const x = i => L + i * dx;
  const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  let path = '', pen = false;
  pts.forEach(p => {
    if (p.avg === null) { pen = false; return; }
    path += `${pen ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.avg).toFixed(1)}`;
    pen = true;
  });
  const withAvg = pts.filter(p => p.avg !== null);
  const last = withAvg[withAvg.length - 1];
  chart = { pts, x, y, dx, last };
  return `<div class="chart-read" id="chartRead">${chartReadout(last)}</div>
    <svg class="wchart" id="wChart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de poids des 4 dernières semaines. Moyenne actuelle ${fmtNum(last.avg)} kg.">
      ${ticks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ax" x="${L - 6}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end">${fmtNum(v, step < 1 ? 1 : 0)}</text>`).join('')}
      <text class="ax" x="${L}" y="${H - 6}">${fmtDay(pts[0].d)}</text>
      <text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">aujourd'hui</text>
      <line class="xh" id="chartXh" y1="${T}" y2="${H - B}" style="display:none"/>
      <path class="avg" d="${path}"/>
      ${pts.filter(p => p.kg !== null).map(p => `<circle class="dot" cx="${x(p.i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="4"/>`).join('')}
      <circle class="end" cx="${x(last.i).toFixed(1)}" cy="${y(last.avg).toFixed(1)}" r="4.5"/>
      <text class="lbl" x="${(x(last.i) + 8).toFixed(1)}" y="${(y(last.avg) + 4).toFixed(1)}">${fmtNum(last.avg)}</text>
      <circle class="focus" id="chartFocus" r="5" style="display:none"/>
    </svg>
    <div class="chart-key"><span><i class="k-dot"></i>Pesée</span><span><i class="k-line"></i>Moyenne sur 7 jours</span></div>`;
}

function bindChart() {
  const svg = $('#wChart');
  if (!svg || !chart) return;
  const read = $('#chartRead'), xh = $('#chartXh'), focus = $('#chartFocus');
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const vx = ((ev.clientX - r.left) / r.width) * CH.W;
    const i0 = Math.max(0, Math.min(CH.days - 1, Math.round((vx - CH.L) / chart.dx)));
    // jour avec des données le plus proche du doigt
    let best = null;
    chart.pts.forEach(p => { if ((p.kg !== null || p.avg !== null) && (!best || Math.abs(p.i - i0) < Math.abs(best.i - i0))) best = p; });
    if (!best) return;
    const cx = chart.x(best.i).toFixed(1);
    xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.style.display = '';
    const v = best.kg ?? best.avg;
    focus.setAttribute('cx', cx); focus.setAttribute('cy', chart.y(v).toFixed(1)); focus.style.display = '';
    read.innerHTML = chartReadout(best);
  };
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', () => { xh.style.display = 'none'; focus.style.display = 'none'; read.innerHTML = chartReadout(chart.last); });
}

function viewFood() {
  if (!foodReady()) return viewFoodSetup();
  const { today, f, kg, t } = foodNow();
  const p = f.profile;
  const g = goalOf(p);
  const prot = f.protein[today] || 0;
  const crea = !!f.creatine[today];
  const cs = streak(f.creatine, today);
  const w = f.weights[today];
  const avg7 = avgWeight(f.weights, today);
  const rate = trend(f.weights, today);
  const all = sortedWeights(f.weights);
  const recent = all.filter(x => x.d > shiftDay(today, -14)).length;
  return `<div class="t-food">${topbar()}
    <section class="panel today" style="margin-top:6px">
      <div class="today-head"><div class="today-day">Ton objectif</div><div class="today-title">${g.title}</div><div class="today-sub">Vise ${aimText(p, kg)}</div></div>
      <div class="today-body">
        <div class="kcal-big"><b>${fmtInt(t.kcal)}</b><span>kcal par jour</span></div>
        <div class="macros">
          <div><b>${t.protein} g</b><span>protéines</span></div>
          <div><b>${t.fat} g</b><span>lipides</span></div>
          <div><b>${t.carbs} g</b><span>glucides</span></div>
        </div>
        ${reviewCard(review(f, today), p, kg)}
        <p class="small muted" style="margin:8px 0 0">Maintenance estimée ${fmtInt(t.maintenance)} kcal${f.kcalAdj ? ` (dont ${signed(f.kcalAdj, 0)} kcal d'ajustement)` : ''} · ${trainingDays()} séances par semaine · calculé sur ${fmtNum(kg)} kg.</p>
      </div>
    </section>

    <h2 class="section">PROTÉINES DU JOUR</h2>
    <div class="panel">
      <div class="prot-head"><b>${prot}</b><span>/ ${t.protein} g</span>${prot >= t.protein ? '<span class="tag" style="background:#DFFFE9">✓ Objectif atteint</span>' : `<span class="small muted">encore ${t.protein - prot} g</span>`}</div>
      <div class="progress"><i style="width:${Math.min(100, (prot / t.protein) * 100)}%"></i></div>
      <div class="prot-btns">
        <button class="btn" data-act="prot" data-g="-10" ${prot <= 0 ? 'disabled' : ''} aria-label="Retirer 10 grammes">−10</button>
        <button class="btn accent" data-act="prot" data-g="10">+10 g</button>
        <button class="btn accent" data-act="prot" data-g="25">+25 g</button>
        <button class="btn accent" data-act="prot" data-g="35">+35 g</button>
      </div>
      <div class="set-item crea"><span>Créatine 5 g<small>${cs > 1 ? `🔥 ${cs} jours d'affilée` : 'Une dose par jour, même les jours off'}</small></span><label class="switch"><input type="checkbox" data-crea ${crea ? 'checked' : ''}><span></span></label></div>
      <details class="food-ref"><summary>Repères protéines</summary><ul>
        <li>100 g de blanc de poulet cuit ≈ 30 g</li>
        <li>1 boîte de thon (≈ 110 g égoutté) ≈ 28 g</li>
        <li>1 dose de whey (30 g) ≈ 24 g</li>
        <li>250 g de skyr ≈ 25 g</li>
        <li>1 steak haché 5 % (100 g) ≈ 20 g</li>
        <li>3 œufs ≈ 18 g</li>
      </ul></details>
    </div>

    <h2 class="section">PESÉE DU MATIN</h2>
    <div class="panel">
      <div class="weigh-row">
        <input id="weighIn" inputmode="decimal" enterkeyhint="done" placeholder="${fmtNum(kg)}" value="${w !== undefined ? fmtNum(w) : ''}" aria-label="Poids de ce matin en kg">
        <span>kg</span>
        <button class="btn accent" data-act="weigh">${w !== undefined ? 'Corriger' : 'Enregistrer'}</button>
      </div>
      <p class="small muted" style="margin:8px 0 0">Au réveil, après les toilettes, avant de manger. Ne regarde que la moyenne : le poids d'un jour bouge avec l'eau.</p>
      <div class="stats sm">
        <div class="panel stat"><b>${avg7 !== null ? fmtNum(avg7) : '—'}</b><span>moy. 7 j (kg)</span></div>
        <div class="panel stat"><b>${rate !== null ? signed(rate, 2) : '—'}</b><span>kg / semaine</span></div>
        <div class="panel stat"><b>${recent}/14</b><span>pesées</span></div>
      </div>
      ${weightChart(today)}
      <details class="food-ref"><summary>Toutes les pesées (${all.length})</summary>
        <div class="log-body">${[...all].reverse().slice(0, 60).map(x => `<div><span>${fmtDay(x.d)}</span><span>${fmtNum(x.kg)} kg<button class="mini-x" data-act="del-weight" data-d="${x.d}" aria-label="Supprimer la pesée du ${fmtDay(x.d)}">×</button></span></div>`).join('')}</div>
      </details>
    </div>

    <h2 class="section">MENU DE LA SEMAINE</h2>
    <a class="panel recipe-card menu-cta" href="#/menu">
      <span class="r-emoji" aria-hidden="true">📅</span>
      <span class="r-main"><b>3 plats cuisinés le dimanche</b><small>14 repas du dimanche au samedi et la liste de courses</small></span>
      <span class="chev">›</span>
    </a>

    <h2 class="section">RECETTES COOKEO</h2>
    <div class="recipe-list">${(p.goal === 'cut' ? [...RECIPES].sort((a, b) => a.kcal - b.kcal) : RECIPES).map(r => `
      <button class="panel recipe-card" data-act="recipe" data-id="${r.id}">
        <span class="r-emoji" aria-hidden="true">${r.emoji}</span>
        <span class="r-main"><b>${esc(r.name)}</b><small>≈ ${r.time} min · ${r.portions} portions · ${esc(r.tag)}</small></span>
        <span class="r-macro"><b>${r.p} g</b><small>prot.</small><b>${r.kcal}</b><small>kcal</small></span>
      </button>`).join('')}</div>

    <h2 class="section">TON PROFIL</h2>
    <div class="panel set-list">
      <div class="set-item"><span>Objectif</span><select data-prof="goal">${goalOptions(p.goal)}</select></div>
      <div class="set-item"><span>Taille<small>en cm</small></span><input class="prof-in" data-prof="height" inputmode="numeric" value="${p.height}"></div>
      <div class="set-item"><span>Âge</span><input class="prof-in" data-prof="age" inputmode="numeric" value="${p.age}"></div>
      <div class="set-item"><span>Sexe<small>Pour le calcul du métabolisme</small></span><select data-prof="sex">${sexOptions(p.sex)}</select></div>
      <div class="set-item"><span>Ajustement auto<small>Déduit de ta courbe de poids</small></span>${f.kcalAdj
        ? `<span class="row"><b>${signed(f.kcalAdj, 0)} kcal</b><button class="btn sm" data-act="food-reset-adj">Remettre à 0</button></span>`
        : '<span class="muted">aucun</span>'}</div>
    </div>

    <h2 class="section">ASTUCES ICH</h2>
    <div class="panel">
      <ul class="cues" style="margin:0">
        ${p.goal === 'cut' ? '' : '<li><span><b>Le shaker ICH</b> : 500 ml de lait entier, 80 g de flocons d\'avoine, 1 banane et 30 g de beurre de cacahuète, mixés. ≈ 900 kcal et 35 g de protéines.</span></li>'}
        <li><span><b>4 repas</b> avec 30 à 40 g de protéines chacun : plus simple que 2 repas énormes.</span></li>
        <li><span><b>Les 2 premières semaines</b>, la balance prend vite environ 1 kg (eau et glycogène). Normal, ce n'est pas du gras.</span></li>
        <li><span><b>Tour de taille</b> : mesure-le au nombril une fois par mois. S'il gonfle plus vite que tes bras, ça monte trop vite.</span></li>
      </ul>
    </div></div>`;
}

// ───────────────────────── Menu de la semaine ─────────────────────────
const fmtShort = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const DOW = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

// Semaine affichée (dimanche → samedi). Le samedi, jour des courses, on montre la semaine suivante.
function menuSunday(arg) {
  const t = todayIso();
  const cur = weekStart(t);
  if (arg === 'next') return shiftDay(cur, 7);
  if (arg === 'now') return cur;
  return new Date(t + 'T12:00:00').getDay() === 6 ? shiftDay(cur, 7) : cur;
}
const picksFor = sun => S.food.menus[sun] || defaultPicks(sun);
// Petit-déj fixe et shaker (par défaut : shaker sauf en sèche)
const breakfastId = () => (BREAKFASTS.includes(S.food.daily.breakfast) ? S.food.daily.breakfast : BREAKFASTS[0]);
const shakerOn = () => S.food.daily.shaker ?? (S.food.profile.goal !== 'cut');

// On ne garde que les menus et listes des 4 dernières semaines
function pruneWeeks() {
  const limit = shiftDay(weekStart(todayIso()), -28);
  ['menus', 'shop'].forEach(k => Object.keys(S.food[k]).forEach(w => { if (w < limit) delete S.food[k][w]; }));
}

function viewMenu(arg) {
  const sun = menuSunday(arg);
  const isNext = sun !== weekStart(todayIso());
  const picks = picksFor(sun);
  const plan = mealPlan(sun, picks);
  const bf = RECIPE[breakfastId()];
  const sh = shakerOn() ? RECIPE.shaker : null;
  const list = shoppingList([...picks, SUNDAY_DISH, { id: bf.id, n: 7 }, ...(sh ? [{ id: sh.id, n: 7 }] : [])]);
  const checked = S.food.shop[sun] || {};
  const nDone = list.groups.reduce((n, g) => n + g.items.filter(i => checked[i.key]).length, 0);
  // Moyenne par jour : midi + soir du menu, plus le petit-déj et le shaker de tous les jours
  const meals = plan.flatMap(d => [d.midi, d.soir]).map(id => RECIPE[id]);
  const avgK = meals.reduce((s, r) => s + r.kcal, 0) / 7 + bf.kcal + (sh ? sh.kcal : 0);
  const avgP = meals.reduce((s, r) => s + r.p, 0) / 7 + bf.p + (sh ? sh.p : 0);
  const today = todayIso();
  let summary = `Ta journée type fait ≈ <b>${fmtInt(avgK)} kcal</b> et <b>${Math.round(avgP)} g de protéines</b>.`;
  if (foodReady()) {
    const { t } = foodNow();
    const diff = avgK - t.kcal;
    if (Math.abs(diff) <= 150) summary += ` Pile dans ton objectif de ${fmtInt(t.kcal)} kcal. ICH&nbsp;!`;
    else if (diff < 0) summary += ` Il te manque ≈ <b>${fmtInt(-diff)} kcal</b> pour tes ${fmtInt(t.kcal)} : ${sh ? 'ajoute un fruit et une poignée d\'amandes' : 'remets le shaker'}.`;
    else summary += ` C'est ≈ <b>${fmtInt(diff)} kcal</b> de plus que tes ${fmtInt(t.kcal)} : ${sh ? 'garde le shaker pour les jours de séance' : 'prends des portions un peu plus petites'}.`;
    if (avgP < t.protein) summary += ` Protéines : il en manque ≈ ${Math.round(t.protein - avgP)} g.`;
  }
  const meal = (id, frozen) => {
    const r = RECIPE[id];
    return `<button class="meal ${frozen ? 'frozen' : ''}" data-act="recipe" data-id="${id}"><span aria-hidden="true">${r.emoji}</span><span>${esc(r.short)}</span>${frozen ? '<i title="Au congélateur">🧊</i>' : ''}</button>`;
  };
  const sd = RECIPE[SUNDAY_DISH];
  return `<div class="t-food">
    <a class="back" href="#/food">← Bouffe</a>
    <div class="sess-head"><h1>MENU</h1><p>Du dimanche ${fmtShort(sun)} au samedi ${fmtShort(shiftDay(sun, 6))}</p></div>
    <div class="seg">
      <a href="#/menu/now" class="${isNext ? '' : 'on'}">Cette semaine</a>
      <a href="#/menu/next" class="${isNext ? 'on' : ''}">Semaine prochaine</a>
    </div>

    <h2 class="section">LES 3 PLATS</h2>
    <div class="recipe-list">${picks.map((id, i) => {
      const r = RECIPE[id];
      return `<div class="panel recipe-card pick">
        <span class="r-emoji" aria-hidden="true">${r.emoji}</span>
        <button class="r-main" data-act="recipe" data-id="${id}"><b>${esc(r.name)}</b><small>4 portions · ${r.kcal} kcal · ${r.p} g prot.</small></button>
        <button class="btn sm" data-act="menu-swap" data-w="${sun}" data-i="${i}" aria-label="Changer : ${esc(r.name)}">↻</button>
      </div>`;
    }).join('')}
      <button class="panel recipe-card" data-act="recipe" data-id="${SUNDAY_DISH}">
        <span class="r-emoji" aria-hidden="true">${sd.emoji}</span>
        <span class="r-main"><b>${esc(sd.name)}</b><small>Le dimanche, cuisiné frais</small></span>
        <span class="chev">›</span>
      </button>
    </div>

    <h2 class="section">CHAQUE JOUR</h2>
    <div class="recipe-list">
      <div class="panel recipe-card pick">
        <span class="r-emoji" aria-hidden="true">${bf.emoji}</span>
        <button class="r-main" data-act="recipe" data-id="${bf.id}"><b>${esc(bf.name)}</b><small>Le matin · ${bf.kcal} kcal · ${bf.p} g prot.</small></button>
        <button class="btn sm" data-act="daily-swap" aria-label="Changer de petit-déj">↻</button>
      </div>
      <div class="panel recipe-card pick ${sh ? '' : 'off'}">
        <span class="r-emoji" aria-hidden="true">${RECIPE.shaker.emoji}</span>
        <button class="r-main" data-act="recipe" data-id="shaker"><b>Shaker ICH</b><small>${sh ? `Après la séance ou à 16 h · ${RECIPE.shaker.kcal} kcal · ${RECIPE.shaker.p} g prot.` : 'Désactivé'}</small></button>
        <label class="switch" aria-label="Shaker tous les jours"><input type="checkbox" data-daily="shaker" ${sh ? 'checked' : ''}><span></span></label>
      </div>
    </div>
    <div class="hint" style="margin-top:14px">🍽️ ${summary}</div>

    <h2 class="section">ORGANISATION</h2>
    <div class="panel"><ul class="cues" style="margin:0">
      <li><span><b>Samedi ${fmtShort(shiftDay(sun, -1))}</b> : les courses avec la liste plus bas.</span></li>
      <li><span><b>Dimanche ${fmtShort(sun)}</b> : les 3 plats au Cookeo, l'un après l'autre (≈ 1 h 30, rince la cuve entre deux). Midi et soir : saumon frais.</span></li>
      <li><span><b>Dimanche soir</b> : 6 boîtes au frigo pour lundi → mercredi, 6 au congélateur pour jeudi → samedi.</span></li>
      <li><span><b>Mercredi, jeudi et vendredi soir</b> : sors les 2 boîtes du lendemain du congélateur et mets-les au frigo.</span></li>
      ${bf.id === 'bol' ? '<li><span><b>Le soir</b> : prépare le bol du lendemain (2 min), ou 3 bocaux d\'un coup, ils tiennent 3 jours.</span></li>' : ''}
    </ul></div>

    <h2 class="section">LES REPAS</h2>
    <p class="small muted" style="margin:-4px 0 10px;font-weight:700">Et chaque jour : ${bf.emoji} ${esc(bf.short)} le matin${sh ? ' et 🥤 shaker l\'après-midi' : ''}.</p>
    <div class="panel days">
      <div class="day-row head"><span></span><span>MIDI</span><span>SOIR</span></div>
      ${plan.map(d => `<div class="day-row ${d.date === today ? 'today' : ''}">
        <span class="dn">${DOW[new Date(d.date + 'T12:00:00').getDay()]}<small>${fmtShort(d.date)}</small></span>
        ${meal(d.midi, d.frozen)}${meal(d.soir, d.frozen)}
      </div>`).join('')}
    </div>

    <h2 class="section">LISTE DE COURSES</h2>
    <div class="panel shop">
      <div class="prot-head"><b>${nDone}</b><span>/ ${list.count} articles</span>${nDone
        ? `<button class="btn sm" data-act="shop-reset" data-w="${sun}">Tout décocher</button>`
        : '<span class="small muted">coche au fur et à mesure</span>'}</div>
      <div class="progress"><i style="width:${(nDone / list.count) * 100}%"></i></div>
      ${list.groups.map(g => `<h3>${g.title.toUpperCase()}</h3>${g.items.map(i => `
        <label class="shop-item ${checked[i.key] ? 'done' : ''}">
          <input type="checkbox" data-shop="${esc(i.key)}" data-w="${sun}" ${checked[i.key] ? 'checked' : ''}>
          <span>${esc(i.label)}</span><span class="q">${fmtQty(i.q, i.u)}</span>
        </label>`).join('')}`).join('')}
      <p class="small muted" style="margin:14px 0 0"><b>Dans tes placards ?</b> ${list.placard.map(esc).join(', ')}.</p>
    </div>
  </div>`;
}

// Ajoute (ou retire) des protéines au compteur du jour, avec la fête quand l'objectif tombe
function addProtein(delta) {
  const k = todayIso();
  const goal = foodNow().t.protein;
  const before = S.food.protein[k] || 0;
  const after = Math.max(0, before + delta);
  if (after) S.food.protein[k] = after; else delete S.food.protein[k];
  save(); render(); buzz(30);
  if (before < goal && after >= goal) { burst('PROTÉINES !!!'); yell(); }
  return after;
}

const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function openRecipe(id) {
  const r = RECIPE[id];
  if (!r) return;
  const wrap = $('#sheet');
  wrap.firstElementChild.innerHTML = `<div class="grab"></div>
    <div class="r-hero" aria-hidden="true">${r.emoji}</div>
    <h2>${esc(r.name)}</h2>
    <p class="muted" style="margin:2px 0 0;font-weight:700">${r.portions} portion${r.portions > 1 ? 's' : ''} · ≈ ${r.time} min · ${esc(r.tag)}</p>
    <div class="macros four t-food">
      <div><b>${r.kcal}</b><span>kcal</span></div>
      <div><b>${r.p} g</b><span>prot.</span></div>
      <div><b>${r.l} g</b><span>lip.</span></div>
      <div><b>${r.g} g</b><span>gluc.</span></div>
    </div>
    <p class="small muted" style="margin:-4px 0 0">Par portion, valeurs approximatives.</p>
    <h3 class="sheet-h">INGRÉDIENTS</h3>
    <ul class="ingr">${r.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <h3 class="sheet-h">${r.how || 'AU COOKEO'}</h3>
    <ol class="steps">${r.steps.map(s => `<li><span>${md(s)}</span></li>`).join('')}</ol>
    ${r.tip ? `<div class="hint warm">💡 ${esc(r.tip)}</div>` : ''}
    <div class="t-food"><button class="btn big" data-act="eat" data-id="${r.id}" style="background:var(--accent)">${r.eat || 'J\'EN MANGE UNE !'} +${r.p} G</button></div>
    <button class="btn block" data-act="close-sheet" style="margin-top:10px">Fermer</button>`;
  wrap.classList.remove('hidden');
  wrap.firstElementChild.scrollTop = 0;
}

function weigh() {
  const inp = $('#weighIn');
  const v = num(inp.value);
  if (!(v >= 30 && v <= 250)) { toast('Ton poids en kg, genre 68,5.'); inp.focus(); return; }
  const k = todayIso();
  const had = S.food.weights[k] !== undefined;
  S.food.weights[k] = Math.round(v * 100) / 100;
  save(); render();
  toast(had ? 'Pesée corrigée.' : 'Pesée notée. ICH !');
}

function foodSetup() {
  const h = num($('#fHeight').value), w = num($('#fWeight').value), a = num($('#fAge').value);
  if (!(h >= 120 && h <= 230)) return toast('Ta taille en cm, genre 175.');
  if (!(w >= 30 && w <= 250)) return toast('Ton poids en kg, genre 68,5.');
  if (!(a >= 14 && a <= 90)) return toast('Ton âge, champion ?');
  Object.assign(S.food.profile, { height: Math.round(h), age: Math.round(a), sex: $('#fSex').value, goal: $('#fGoal').value });
  const k = todayIso();
  S.food.weights[k] = Math.round(w * 100) / 100;
  S.food.adjustedAt = k;
  save(); render();
  burst('À TABLE !!!');
}

// ───────────────────────── Fiche exercice ─────────────────────────
function openSheet(exId) {
  const ex = EXERCISES[exId];
  if (!ex) return;
  const last = lastPerf(exId);
  const best = bestOf(exId);
  const wrap = $('#sheet');
  wrap.firstElementChild.innerHTML = `<div class="grab"></div>
    <img class="big-gif" src="gif/${ex.gif}.gif" alt="Démo animée : ${esc(ex.name)}" onerror="this.src='img/mascot.png'">
    <h2>${esc(ex.name)}</h2>
    <p class="muted" style="margin:2px 0 0;font-weight:700">${esc(ex.muscles)}</p>
    <p class="quip">« ${esc(ex.quip)} »</p>
    <ul class="cues">${ex.cues.map(c => `<li><span>${esc(c)}</span></li>`).join('')}</ul>
    ${last ? `<div class="hint">📒 Dernière fois : <b>${last.sets.map(x => `${fmtKg(x.kg)}×${x.reps}`).join(' · ')}</b></div>` : ''}
    ${best.e > 0 ? `<div class="hint go">🏆 Record : <b>${fmtKg(best.set.kg)} kg × ${best.set.reps}</b> (1RM estimé ${fmtKg(Math.round(best.e))} kg)</div>` : ''}
    <button class="btn block" data-act="close-sheet" style="margin-top:8px">Fermer</button>`;
  wrap.classList.remove('hidden');
}
const closeSheet = () => $('#sheet').classList.add('hidden');

// ───────────────────────── Séance : actions ─────────────────────────
function startWorkout(sid) {
  sound.unlock();
  if (S.active && S.active.sid !== sid) {
    if (!confirm(`Une séance ${SESSIONS[S.active.sid].title} est en cours. La remplacer ?`)) return;
    S.active = null;
  }
  if (!S.active) {
    const p = plan(sid);
    S.active = {
      sid, startedAt: Date.now(), cur: 0, plan: p, rest: null,
      entries: p.map(x => {
        const sg = suggest(x);
        return { ex: x.ex, sets: Array.from({ length: x.sets }, () => ({ kg: sg.kg ?? '', reps: '', done: false })) };
      })
    };
    save();
  }
  location.hash = '#/workout';
}

function nextIncomplete(A) {
  for (let k = 1; k <= A.entries.length; k++) {
    const i = (A.cur + k) % A.entries.length;
    if (A.entries[i].sets.some(s => !s.done)) return i;
  }
  return A.cur;
}

function nope(row, msg, field) {
  row.classList.remove('nope');
  void row.offsetWidth;
  row.classList.add('nope');
  toast(msg);
  row.querySelector(field)?.focus();
  buzz(80);
}

function toggleSet(i) {
  const A = S.active;
  const entry = A.entries[A.cur];
  const set = entry.sets[i];
  const p = A.plan[A.cur];
  if (set.done) { set.done = false; save(); render(); return; }
  const row = $(`.set-row[data-i="${i}"]`);
  if (!BODYWEIGHT.has(p.ex) && !(num(set.kg) >= 0)) return nope(row, 'Et la charge, champion ?', '.kg');
  if (!(num(set.reps) > 0)) return nope(row, 'Combien de reps ? Sois honnête.', '.reps');
  set.done = true;
  set.at = Date.now();
  buzz(40);
  const exDone = entry.sets.every(s => s.done);
  const allDone = A.entries.every(e => e.sets.every(s => s.done));
  if (allDone) {
    save(); render();
    burst('TERMINÉ !!!');
    yell();
    return;
  }
  let label;
  if (exDone) {
    A.cur = nextIncomplete(A);
    label = `Prochain : ${EXERCISES[A.plan[A.cur].ex].name}`;
  } else {
    const k = entry.sets.findIndex(s => !s.done);
    label = `Prochain : série ${k + 1}/${entry.sets.length} — ${EXERCISES[p.ex].name}`;
  }
  startRest(p.rest, label);
  save();
  render();
  if (exDone) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function finishWorkout() {
  const A = S.active;
  const entries = A.entries
    .map(e => ({ ex: e.ex, sets: e.sets.filter(s => s.done).map(s => ({ kg: num(s.kg) || 0, reps: num(s.reps) || 0 })) }))
    .filter(e => e.sets.length);
  if (!entries.length) {
    if (confirm('Aucune série validée. Abandonner la séance ?')) { S.active = null; save(); releaseWake(); location.hash = '#/'; }
    return;
  }
  const remaining = A.entries.reduce((n, e) => n + e.sets.filter(s => !s.done).length, 0);
  if (remaining && !confirm(`Il reste ${remaining} série${remaining > 1 ? 's' : ''}. Terminer quand même ?`)) return;
  const prs = entries.filter(e => !BODYWEIGHT.has(e.ex)).filter(e => {
    const prev = bestOf(e.ex).e;
    return prev > 0 && Math.max(...e.sets.map(e1rm)) > prev + 0.01;
  }).map(e => e.ex);
  const log = {
    id: Date.now().toString(36), date: new Date().toISOString(), sid: A.sid, week: cycleWeek(), deload: isDeload(),
    duration: Date.now() - A.startedAt, entries, prs,
    sets: entries.reduce((n, e) => n + e.sets.length, 0),
    volume: Math.round(entries.reduce((t, e) => t + e.sets.reduce((u, s) => u + s.kg * s.reps, 0), 0))
  };
  S.logs.push(log);
  S.active = null;
  save();
  releaseWake();
  hideRest();
  justFinished = log.id;
  location.hash = '#/done/' + log.id;
}

// ───────────────────────── Chrono de repos ─────────────────────────
const ARC = 2 * Math.PI * 52;
let lastBeep = null;

function startRest(sec, label) {
  S.active.rest = { endAt: Date.now() + sec * 1000, dur: sec, label, line: pick(REST_LINES), min: false };
  lastBeep = null;
  save();
  tickRest();
}

function hideRest() {
  $('#rest').classList.add('hidden');
  $('#restMini').classList.add('hidden');
}

function endRest(natural) {
  if (!S.active || !S.active.rest) return;
  S.active.rest = null;
  save();
  hideRest();
  if (natural) {
    yell();
    buzz([250, 80, 250, 80, 500]);
    document.body.classList.remove('flash');
    void document.body.offsetWidth;
    document.body.classList.add('flash');
  }
  burst(natural ? pick(SHOUTS) : 'GO !!!');
}

function tickRest() {
  const r = S.active && S.active.rest;
  if (!r) { hideRest(); return; }
  const left = (r.endAt - Date.now()) / 1000;
  if (left <= 0) { endRest(true); return; }
  const full = $('#rest');
  const mini = $('#restMini');
  full.classList.toggle('hidden', r.min);
  mini.classList.toggle('hidden', !r.min);
  $('#restTime').textContent = fmtTime(left);
  mini.textContent = `⏱ ${fmtTime(left)} · REPOS`;
  $('#restArc').style.strokeDasharray = ARC;
  $('#restArc').style.strokeDashoffset = ARC * (1 - Math.min(1, left / r.dur));
  $('#restLine').textContent = r.line;
  $('#restNext').textContent = r.label;
  full.classList.toggle('final', left <= 3.2);
  const s = Math.ceil(left);
  if (s <= 3 && s !== lastBeep && !document.hidden) {
    lastBeep = s;
    if (S.settings.sound) sound.beep(660 + (3 - s) * 110);
    buzz(60);
  }
}

// ───────────────────────── Effets ─────────────────────────
let burstTimer;
function burst(text) {
  const b = $('#burst');
  $('#burstText').textContent = text;
  b.classList.remove('hidden');
  const shape = b.querySelector('.burst-shape');
  shape.style.animation = 'none';
  void shape.offsetWidth;
  shape.style.animation = '';
  clearTimeout(burstTimer);
  burstTimer = setTimeout(() => b.classList.add('hidden'), 1100);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

let wakeLock = null;
async function keepAwake() {
  if (!S.settings.wakelock || !S.active || wakeLock || !('wakeLock' in navigator) || document.hidden) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { wakeLock = null; }
}
function releaseWake() { if (wakeLock) wakeLock.release().catch(() => {}); wakeLock = null; }

// ───────────────────────── Routeur ─────────────────────────
let lastRoute = null;
function render() {
  const [, route = '', arg] = location.hash.split('/');
  let html;
  switch (route) {
    case 'week': html = viewWeek(); break;
    case 'session': html = viewSession(arg); break;
    case 'workout': html = viewWorkout(); break;
    case 'history': html = viewHistory(); break;
    case 'food': html = viewFood(); break;
    case 'menu': html = viewMenu(arg); break;
    case 'settings': html = viewSettings(); break;
    case 'done': html = viewDone(arg); break;
    default: html = viewToday();
  }
  const key = route + '/' + (arg || '');
  const animate = key !== lastRoute;
  app.innerHTML = `<div class="${animate ? 'view' : ''}">${html}</div>`;
  if (animate) { window.scrollTo(0, 0); editing = route === 'session' ? editing : false; }
  lastRoute = key;

  if (route === 'food') bindChart();
  if (route === 'history') bindCurve();

  const tab = { '': 'today', week: 'week', session: 'week', food: 'food', menu: 'food', history: 'history', settings: 'settings', done: 'history' }[route];
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const resume = $('#resume');
  const showResume = S.active && route !== 'workout';
  resume.classList.toggle('hidden', !showResume);
  if (showResume) {
    const s = SESSIONS[S.active.sid];
    resume.className = `resume t-${s.type}`;
    $('#resumeTitle').textContent = `${s.title} ›`;
  }
  if (route === 'workout') keepAwake();
  if (route === 'done' && justFinished === arg) {
    justFinished = null;
    setTimeout(() => { burst('ICH !!!'); yell(); buzz([200, 60, 200]); }, 350);
  }
  tickRest();
}

// ───────────────────────── Événements ─────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) {
    if (e.target.id === 'sheet') closeSheet();
    return;
  }
  const act = el.dataset.act;
  const A = S.active;
  switch (act) {
    case 'start': startWorkout(el.dataset.sid); break;
    case 'shout': {
      sound.unlock();
      yell();
      buzz(60);
      const m = $('#heroMascot');
      m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
      const b = $('#heroBubble');
      b.firstChild.textContent = pick(SHOUTS);
      b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
      break;
    }
    case 'info': openSheet(el.dataset.ex); break;
    case 'close-sheet': closeSheet(); break;
    case 'edit': editing = !editing; render(); break;
    case 'reset-ov': {
      const sid = el.dataset.sid;
      Object.keys(S.overrides).filter(k => k.startsWith(sid + ':')).forEach(k => delete S.overrides[k]);
      save(); render(); toast('Séance remise à zéro');
      break;
    }
    case 'set': toggleSet(+el.dataset.i); break;
    case 'goto': A.cur = +el.dataset.i; save(); render(); break;
    case 'prev': if (A.cur > 0) { A.cur--; save(); render(); } break;
    case 'next': if (A.cur < A.plan.length - 1) { A.cur++; save(); render(); } break;
    case 'add-set': {
      const sets = A.entries[A.cur].sets;
      const prev = sets[sets.length - 1];
      sets.push({ kg: prev ? prev.kg : '', reps: '', done: false });
      save(); render();
      break;
    }
    case 'del-set': {
      const sets = A.entries[A.cur].sets;
      if (sets.length > 1) { sets.pop(); save(); render(); }
      break;
    }
    case 'finish': finishWorkout(); break;
    case 'abandon':
      if (confirm('Abandonner la séance ? Les séries ne seront pas enregistrées.')) {
        S.active = null; save(); releaseWake(); hideRest(); location.hash = '#/';
      }
      break;
    case 'test-shout': sound.unlock(); setTimeout(() => sound.shout(), 60); burst('ICH !!!'); break;
    case 'del-log':
      if (confirm('Supprimer cette séance du journal ?')) { S.logs = S.logs.filter(l => l.id !== el.dataset.id); save(); render(); }
      break;
    case 'export': {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ich-sauvegarde-${isoDay(new Date())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      break;
    }
    case 'food-setup': foodSetup(); break;
    case 'weigh': weigh(); break;
    case 'prot': addProtein(+el.dataset.g); break;
    case 'recipe': openRecipe(el.dataset.id); break;
    case 'menu-swap': {
      const w = el.dataset.w;
      const picks = swapPick(picksFor(w), +el.dataset.i);
      S.food.menus[w] = picks;
      pruneWeeks(); save(); render();
      toast(`Nouveau plat : ${RECIPE[picks[+el.dataset.i]].name}`);
      break;
    }
    case 'shop-reset': delete S.food.shop[el.dataset.w]; save(); render(); break;
    case 'daily-swap': {
      const next = BREAKFASTS[(BREAKFASTS.indexOf(breakfastId()) + 1) % BREAKFASTS.length];
      S.food.daily.breakfast = next;
      save(); render();
      toast(`Petit-déj : ${RECIPE[next].name}`);
      break;
    }
    case 'eat': {
      const r = RECIPE[el.dataset.id];
      if (!r) break;
      closeSheet();
      const total = addProtein(r.p);
      toast(`+${r.p} g de protéines (${total} g aujourd'hui). ICH !`);
      break;
    }
    case 'del-weight':
      if (confirm(`Supprimer la pesée du ${fmtDay(el.dataset.d)} ?`)) { delete S.food.weights[el.dataset.d]; save(); render(); }
      break;
    case 'food-apply': {
      const d = +el.dataset.delta;
      S.food.kcalAdj += d;
      S.food.adjustedAt = todayIso();
      save(); render();
      toast(`${signed(d, 0)} kcal par jour. Prochain bilan dans 2 semaines.`);
      break;
    }
    case 'food-skip':
      // on refait le point dans 7 jours
      S.food.adjustedAt = shiftDay(todayIso(), -7);
      save(); render(); toast('OK, on refait le point dans 7 jours.');
      break;
    case 'food-reset-adj':
      if (confirm('Remettre l\'ajustement automatique à 0 kcal ?')) { S.food.kcalAdj = 0; S.food.adjustedAt = todayIso(); save(); render(); }
      break;
    case 'reset':
      if (confirm('Tout effacer ? Historique, records et réglages disparaîtront. Irréversible.')) { resetAll(); hideRest(); location.hash = '#/'; render(); toast('Table rase. ICH !'); }
      break;
  }
});

$('#rest').addEventListener('click', e => {
  const r = S.active && S.active.rest;
  if (!r) return;
  const adj = e.target.closest('[data-adj]');
  if (adj) {
    const d = +adj.dataset.adj;
    r.endAt = Math.max(Date.now() + 1000, r.endAt + d * 1000);
    r.dur = Math.max(r.dur, (r.endAt - Date.now()) / 1000);
    save(); tickRest();
  } else if (e.target.closest('#restSkip')) {
    endRest(false);
  } else if (e.target.closest('#restMin')) {
    r.min = true; save(); tickRest();
  }
});
$('#restMini').addEventListener('click', () => { if (S.active && S.active.rest) { S.active.rest.min = false; save(); tickRest(); } });

app.addEventListener('input', e => {
  const t = e.target;
  if (!t.matches('.set-row input') || !S.active) return;
  const i = +t.closest('.set-row').dataset.i;
  const sets = S.active.entries[S.active.cur].sets;
  const f = t.dataset.f;
  const old = sets[i][f];
  sets[i][f] = t.value;
  if (f === 'kg') {
    // propage la nouvelle charge aux séries suivantes qui avaient la même valeur
    sets.forEach((s, j) => {
      if (j > i && !s.done && String(s.kg) === String(old)) {
        s.kg = t.value;
        const inp = $(`.set-row[data-i="${j}"] .kg`);
        if (inp) inp.value = t.value;
      }
    });
  }
  save();
});

app.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'weighIn') { e.preventDefault(); weigh(); return; }
  if (!e.target.matches('.set-row input')) return;
  e.preventDefault();
  const row = e.target.closest('.set-row');
  if (e.target.dataset.f === 'kg') row.querySelector('.reps').focus();
  else { e.target.blur(); toggleSet(+row.dataset.i); }
});

app.addEventListener('focusin', e => { if (e.target.matches('.set-row input')) e.target.select(); });

app.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.day !== undefined) {
    S.week[+t.dataset.day] = t.value; save(); render();
  } else if (t.dataset.ov) {
    const [sid, i, f] = t.dataset.ov.split(':');
    const key = `${sid}:${i}`;
    let v = t.value;
    if (f === 'sets') v = Math.min(10, Math.max(1, parseInt(v, 10) || 1));
    if (f === 'rest') v = +v;
    if (f === 'reps') v = v.trim() || SESSIONS[sid].exercises[i].reps;
    S.overrides[key] = { ...(S.overrides[key] || {}), [f]: v };
    save(); render();
  } else if (t.dataset.prof) {
    const f = t.dataset.prof;
    const P = S.food.profile;
    if (f === 'goal' || f === 'sex') {
      P[f] = t.value;
      // nouvel objectif = nouvelles calories : le bilan repart de zéro
      if (f === 'goal') { S.food.adjustedAt = todayIso(); toast(`Objectif : ${GOALS[t.value].label}. ICH !`); }
    } else {
      const v = Math.round(num(t.value));
      const ok = f === 'height' ? v >= 120 && v <= 230 : v >= 14 && v <= 90;
      if (!ok) { toast('Valeur bizarre, je garde l\'ancienne.'); render(); return; }
      P[f] = v;
    }
    save(); render();
  } else if (t.dataset.curve !== undefined) {
    curveEx = t.value;
    render();
  } else if (t.dataset.daily === 'shaker') {
    S.food.daily.shaker = t.checked;
    save(); render();
  } else if (t.dataset.shop !== undefined) {
    const w = t.dataset.w;
    const list = (S.food.shop[w] ||= {});
    if (t.checked) list[t.dataset.shop] = true; else delete list[t.dataset.shop];
    pruneWeeks(); save(); render();
  } else if (t.dataset.crea !== undefined) {
    const k = todayIso();
    if (t.checked) S.food.creatine[k] = true; else delete S.food.creatine[k];
    save(); render();
  } else if (t.dataset.setting) {
    S.settings[t.dataset.setting] = t.checked; save();
    if (t.dataset.setting === 'wakelock' && !t.checked) releaseWake();
  } else if (t.dataset.cycle !== undefined) {
    const w = +t.value;
    S.cycleStart = isoDay(new Date(mondayOf().getTime() - (w - 1) * 7 * DAY + 12 * 3600e3));
    save(); render(); toast(w === CYCLE_WEEKS ? 'Semaine deload. Repos du guerrier.' : `Semaine ${w}. ICH !`);
  } else if (t.dataset.import !== undefined && t.files[0]) {
    t.files[0].text().then(txt => {
      const data = JSON.parse(txt);
      if (!data || !Array.isArray(data.logs)) throw new Error('format');
      if (!confirm(`Importer ${data.logs.length} séance(s) ? Les données actuelles seront remplacées.`)) return;
      replaceAll(data); render(); toast('Import réussi. ICH !');
    }).catch(() => toast('Fichier invalide 😤'));
  }
});

document.addEventListener('pointerdown', () => sound.unlock(), { once: true });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { tickRest(); if (location.hash === '#/workout') keepAwake(); }
});
window.addEventListener('hashchange', () => { closeSheet(); render(); });

setInterval(() => {
  tickRest();
  const c = $('#wkClock');
  if (c && S.active) c.textContent = fmtTime((Date.now() - S.active.startedAt) / 1000);
}, 250);

render();

// ───────────────────────── PWA ─────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    // Pré-charge toutes les animations pour l'usage hors ligne en salle
    if ('caches' in window) {
      const gifs = [...new Set(Object.values(EXERCISES).map(x => `gif/${x.gif}.gif`))];
      caches.open('ich-media-v1').then(c => Promise.all(gifs.map(u => c.match(u).then(m => m || c.add(u).catch(() => {}))))).catch(() => {});
    }
  });
}
