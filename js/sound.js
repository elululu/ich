// Sons : le cri « ICH !!! » (fichier audio) + bips du chrono synthétisés en WebAudio.
const SHOUT_FILES = ['audio/ich1.m4a', 'audio/ich2.m4a'];
let ctx = null;
let buffers = [];
let loading = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function loadIch() {
  if (loading) return loading;
  const c = getCtx();
  if (!c) return Promise.resolve();
  loading = Promise.all(SHOUT_FILES.map(url => fetch(url)
    .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('no audio'))))
    .then(buf => new Promise((res, rej) => c.decodeAudioData(buf, res, rej)))
    .catch(() => null)))
    .then(list => { buffers = list.filter(Boolean); });
  return loading;
}

// À appeler sur un geste utilisateur (iOS exige un tap pour débloquer l'audio).
export function unlock() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  // buffer silencieux pour réveiller Safari
  const src = c.createBufferSource();
  src.buffer = c.createBuffer(1, 1, 22050);
  src.connect(c.destination);
  src.start(0);
  loadIch();
}

export function beep(freq = 880, dur = 0.12, vol = 0.25) {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

// Corne de brume de secours si le fichier audio n'est pas dispo.
function horn() {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime;
  [233, 294, 349].forEach(f => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 1.06, t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.85);
  });
}

export async function shout() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') { try { await c.resume(); } catch { /* geste requis */ } }
  await loadIch();
  if (buffers.length && c.state === 'running') {
    const src = c.createBufferSource();
    const g = c.createGain();
    g.gain.value = 1;
    src.buffer = buffers[Math.floor(Math.random() * buffers.length)];
    src.connect(g).connect(c.destination);
    src.start();
  } else {
    horn();
  }
}
