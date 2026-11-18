// ICH !!! service worker — tout marche hors ligne, même au sous-sol de la salle.
const VERSION = 'ich-v7';
const MEDIA = 'ich-media-v1';
const CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/data.js',
  'js/store.js',
  'js/food.js',
  'js/recipes.js',
  'js/sound.js',
  'fonts/bangers.woff2',
  'fonts/archivo.woff2',
  'img/mascot.png',
  'img/mascot_rest.png',
  'img/mascot_win.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'audio/ich1.m4a',
  'audio/ich2.m4a',
  'manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== MEDIA).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // GIF & médias : cache d'abord (ils ne changent jamais)
  if (/\.(gif|png|m4a|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(MEDIA).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Code de l'app : réseau d'abord (pour recevoir les mises à jour), cache en secours
  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
