import { EXERCISES, SESSIONS, DAY_NAMES, DAY_SHORT, CYCLE_WEEKS, SHOUTS, REST_LINES } from './data.js';
import { S, save, mondayOf, isoDay, replaceAll, resetAll } from './store.js';
import * as sound from './sound.js';

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
    <h2 class="section">CETTE SEMAINE</h2>
    ${weekStrip()}`;
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
      <div class="set-item"><span>Tout effacer<small>Historique, réglages, séance en cours</small></span><button class="btn sm" data-act="reset" style="background:var(--red);color:#fff">Effacer</button></div>
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
    case 'settings': html = viewSettings(); break;
    case 'done': html = viewDone(arg); break;
    default: html = viewToday();
  }
  const key = route + '/' + (arg || '');
  const animate = key !== lastRoute;
  app.innerHTML = `<div class="${animate ? 'view' : ''}">${html}</div>`;
  if (animate) { window.scrollTo(0, 0); editing = route === 'session' ? editing : false; }
  lastRoute = key;

  const tab = { '': 'today', week: 'week', session: 'week', history: 'history', settings: 'settings', done: 'history' }[route];
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
  if (e.key !== 'Enter' || !e.target.matches('.set-row input')) return;
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
