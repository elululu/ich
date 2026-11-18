# ICH !!! — PWA muscu Push / Pull / Legs

PWA sans build (HTML + CSS + JS modules). Programme avancé PPL ×2 sur 6 jours + 1 jour off, cycle de 5 semaines (S5 = deload), séries/charges/reps, chrono de repos plein écran avec cri « ICH !!! », suggestions de progression, records (1RM estimé), historique. Onglet BOUFFE : calories et macros calculées depuis le profil, pesée du matin avec moyenne sur 7 jours et courbe, ajustement automatique des calories toutes les 2 semaines, compteur de protéines, suivi de la créatine, 9 recettes Cookeo riches en protéines et un menu de la semaine (3 plats cuisinés le dimanche, 14 repas, petit-déj et shaker de tous les jours, liste de courses à cocher). Tout est stocké en local sur le téléphone (`localStorage`).

**En ligne : https://elululu.github.io/ich/** (GitHub Pages, branche `main`, dépôt [elululu/ich](https://github.com/elululu/ich)).

Pour mettre à jour le site : modifier, incrémenter `VERSION` dans `sw.js`, puis `git commit` et `git push` — GitHub Pages republie tout seul en une minute environ.

## Lancer en local

```bash
python3 -m http.server 5173
```

Puis ouvrir http://localhost:5173

## Installer sur le téléphone

Le service worker (mode hors ligne + installation) exige **HTTPS**. Déployer le dossier tel quel sur un hébergeur statique (GitHub Pages, Netlify, Vercel, Cloudflare Pages), **sans le dossier `_sources/`** (fichiers d'origine haute résolution, ~10 Mo inutiles en prod).

- iPhone : Safari → Partager → « Sur l'écran d'accueil »
- Android : Chrome → ⋮ → « Installer l'application »

## Structure

| Dossier | Contenu |
|---|---|
| `js/data.js` | Exercices (consignes, phrases ICH) et les 6 séances (séries, reps, repos, RPE, tempo) |
| `js/app.js` | Vues, séance en cours, chrono de repos, progression, écran BOUFFE |
| `js/food.js` | Calculs d'alimentation : besoins (Mifflin-St Jeor), macros, tendance du poids, bilan auto |
| `js/recipes.js` | Recettes Cookeo (ingrédients, étapes, macros par portion, achats) et menu de la semaine |
| `js/store.js` | Sauvegarde locale |
| `js/sound.js` | Cris « ICH !!! » + bips WebAudio |
| `gif/` | 31 démos animées (une par exercice) |
| `img/` | Mascotte : normale, repos, victoire |
| `audio/` | 2 cris « ICH !!! » joués au hasard |

Après une modification des fichiers, incrémenter `VERSION` dans `sw.js` pour forcer la mise à jour du cache.

## Visuels Higgsfield

Générés avec GPT Image 2.6 (GIF natifs 384×384, 12 images). Image de référence de la mascotte (à réutiliser pour de nouveaux exercices, rôle `image_references`) : job `86379088-8b66-41b8-92f2-7256ffb5c310`. Cris : Seed Audio 1.0 et ElevenLabs v4 Turbo (voix « Knox »).
