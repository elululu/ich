// ICH !!! — Programme Push / Pull / Legs niveau avancé
// Rotation 6 jours (PPL A force + PPL B hypertrophie) + 1 jour off.
// Cycle de 5 semaines : S1 → S4 montée en charge, S5 = deload (volume −40 %, RPE 6).

export const EXERCISES = {
  // ───────── PUSH ─────────
  bench: {
    name: 'Développé couché barre', muscles: 'Pectoraux · triceps · épaules', gif: 'bench', lower: false,
    cues: ['Omoplates serrées et basses, petit arc lombaire', 'Barre au bas des pecs, coudes à ~45°', 'Pieds ancrés, pousse avec les jambes'],
    quip: 'La barre descend, ton ego monte.'
  },
  db_bench: {
    name: 'Développé couché haltères', muscles: 'Pectoraux · triceps · épaules', gif: 'db_bench', lower: false,
    cues: ['Monte les haltères en les posant sur les genoux, puis bascule en arrière', 'Omoplates serrées, coudes à ~45°, descente lente jusqu\'à l\'étirement des pecs', 'Pousse en rapprochant légèrement les haltères, sans les cogner en haut'],
    quip: 'Deux haltères, deux fois plus d\'ICH.'
  },
  ohp: {
    name: 'Développé militaire debout', muscles: 'Épaules · triceps · gainage', gif: 'ohp', lower: false,
    cues: ['Fessiers et abdos contractés, pas de cambrure', 'Tête qui passe sous la barre en fin de mouvement', 'Avant-bras verticaux'],
    quip: 'Pousse le plafond. Le plafond a peur.'
  },
  incline_db: {
    name: 'Développé incliné haltères', muscles: 'Haut des pecs · épaules', gif: 'incline_db', lower: false,
    cues: ['Banc à 30°, pas plus', 'Descente lente (3 s), étirement en bas', 'Les haltères se rapprochent sans se cogner'],
    quip: 'Le haut des pecs, c\'est le balcon de la maison.'
  },
  dips: {
    name: 'Dips lestés', muscles: 'Pectoraux bas · triceps', gif: 'dips', lower: false,
    cues: ['Buste légèrement penché pour les pecs', 'Descends jusqu\'à épaules sous les coudes', 'Pas de rebond en bas'],
    quip: 'Rajoute un disque. Non, un autre.'
  },
  lateral_raise: {
    name: 'Élévations latérales', muscles: 'Deltoïde moyen', gif: 'lateral_raise', lower: false,
    cues: ['Coudes légèrement fléchis, menés par les coudes', 'Monte à hauteur d\'épaules, pas plus', 'Zéro élan : charge légère, contrôle total'],
    quip: 'Les épaules en 3D, ça se mérite.'
  },
  pushdown: {
    name: 'Extension triceps poulie', muscles: 'Triceps', gif: 'pushdown', lower: false,
    cues: ['Coudes collés au corps, immobiles', 'Écarte la corde en bas', 'Remonte jusqu\'à 90° seulement'],
    quip: 'Le triceps, c\'est 2/3 du bras. Calcule.'
  },
  incline_bb: {
    name: 'Développé incliné barre', muscles: 'Haut des pecs · épaules · triceps', gif: 'incline_bb', lower: false,
    cues: ['Banc à 30°', 'Barre sous les clavicules', 'Contrôle 2 s en descente, explosif en montée'],
    quip: 'Incliné = pecs en mode montée en grade.'
  },
  seated_db_press: {
    name: 'Développé haltères assis', muscles: 'Épaules · triceps', gif: 'seated_db_press', lower: false,
    cues: ['Dossier presque vertical', 'Haltères à hauteur d\'oreilles en bas', 'Ne verrouille pas totalement en haut'],
    quip: 'Assis mais pas tranquille.'
  },
  cable_fly: {
    name: 'Écarté poulie vis-à-vis', muscles: 'Pectoraux', gif: 'cable_fly', lower: false,
    cues: ['Coudes fixes, légère flexion', 'Pense « faire un câlin à un arbre »', 'Serre 1 s quand les mains se croisent'],
    quip: 'Câlin à un arbre. Un gros arbre.'
  },
  skullcrusher: {
    name: 'Barre au front (EZ)', muscles: 'Triceps (long chef)', gif: 'skullcrusher', lower: false,
    cues: ['Bras légèrement inclinés vers l\'arrière', 'Descends derrière la tête, pas sur le front', 'Coudes qui ne s\'écartent pas'],
    quip: 'Le nom fait peur. C\'est voulu.'
  },
  // ───────── PULL ─────────
  deadlift: {
    name: 'Soulevé de terre', muscles: 'Chaîne postérieure · dos · grip', gif: 'deadlift', lower: true,
    cues: ['Barre au-dessus du milieu du pied', 'Dos gainé, poitrine haute, tire le « mou » de la barre', 'Pousse le sol, hanches et épaules montent ensemble'],
    quip: 'Tu ne soulèves pas la barre. Tu repousses la planète.'
  },
  pullup: {
    name: 'Tractions lestées', muscles: 'Grand dorsal · biceps', gif: 'pullup', lower: false,
    cues: ['Départ bras tendus, épaules engagées', 'Tire les coudes vers les poches', 'Menton au-dessus de la barre, sans kipping'],
    quip: 'Ton corps est une charge. Ajoute une charge à ta charge.'
  },
  bb_row: {
    name: 'Rowing barre penché', muscles: 'Dos épais · trapèzes · lombaires', gif: 'bb_row', lower: false,
    cues: ['Buste à ~45°, dos neutre', 'Barre vers le nombril', 'Serre les omoplates 1 s en haut'],
    quip: 'Un dos épais, ça se rame.'
  },
  face_pull: {
    name: 'Face pull', muscles: 'Deltoïdes arrière · coiffe', gif: 'face_pull', lower: false,
    cues: ['Poulie à hauteur du front', 'Tire vers les yeux, coudes hauts', 'Rotation externe en fin : pose « double biceps »'],
    quip: 'Assurance-vie de tes épaules.'
  },
  ez_curl: {
    name: 'Curl barre EZ', muscles: 'Biceps', gif: 'ez_curl', lower: false,
    cues: ['Coudes fixes le long du corps', 'Pas de balancier du buste', 'Descente lente en 3 s'],
    quip: 'Les manches de t-shirt vont souffrir.'
  },
  hammer_curl: {
    name: 'Curl marteau', muscles: 'Brachial · avant-bras', gif: 'hammer_curl', lower: false,
    cues: ['Prise neutre (pouces en haut)', 'Alterné ou simultané, mais strict', 'Serre fort la poignée'],
    quip: 'Bras épais vu de face ET de profil.'
  },
  db_row: {
    name: 'Rowing haltère unilatéral', muscles: 'Grand dorsal · dos', gif: 'db_row', lower: false,
    cues: ['Genou + main sur le banc, dos plat', 'Tire l\'haltère vers la hanche', 'Étire bien en bas'],
    quip: 'Démarre la tondeuse. Lentement.'
  },
  lat_pulldown: {
    name: 'Tirage vertical', muscles: 'Grand dorsal', gif: 'lat_pulldown', lower: false,
    cues: ['Légère inclinaison arrière', 'Barre vers le haut de la poitrine', 'Remontée contrôlée, épaules étirées'],
    quip: 'Les ailes, c\'est ici qu\'elles poussent.'
  },
  rear_delt_fly: {
    name: 'Oiseau haltères', muscles: 'Deltoïdes arrière', gif: 'rear_delt_fly', lower: false,
    cues: ['Buste penché presque à l\'horizontale', 'Petits haltères, bras quasi tendus', 'Ouvre large, pas de trapèzes'],
    quip: 'Un oiseau. Un gros oiseau énervé.'
  },
  incline_curl: {
    name: 'Curl incliné haltères', muscles: 'Biceps (long chef)', gif: 'incline_curl', lower: false,
    cues: ['Banc à 45-60°, bras pendants derrière le buste', 'Supination complète en haut', 'Étirement total en bas'],
    quip: 'Le pic du biceps se construit ici.'
  },
  shrug: {
    name: 'Shrugs haltères', muscles: 'Trapèzes', gif: 'shrug', lower: false,
    cues: ['Monte les épaules vers les oreilles', 'Pause 1 s en haut', 'Pas de rotation des épaules'],
    quip: 'Objectif : ne plus avoir de cou.'
  },
  // ───────── LEGS ─────────
  squat: {
    name: 'Squat barre', muscles: 'Quadriceps · fessiers · gainage', gif: 'squat', lower: true,
    cues: ['Respiration + gainage avant chaque rep', 'Genoux dans l\'axe des pieds', 'Sous la parallèle, remonte en poussant le sol'],
    quip: 'Le roi des exos. Toi, t\'es le roi du squat.'
  },
  rdl: {
    name: 'Soulevé de terre roumain', muscles: 'Ischios · fessiers', gif: 'rdl', lower: true,
    cues: ['Genoux légèrement fléchis, fixes', 'Pousse les hanches vers l\'arrière', 'Barre collée aux cuisses, stop à mi-tibia'],
    quip: 'Les ischios hurlent. Toi aussi : ICH !'
  },
  leg_press: {
    name: 'Presse à cuisses', muscles: 'Quadriceps · fessiers', gif: 'leg_press', lower: true,
    cues: ['Bas du dos collé au dossier', 'Amplitude max sans décoller les fesses', 'Ne verrouille pas les genoux'],
    quip: 'Charge toute la machine. Toute.'
  },
  leg_curl: {
    name: 'Leg curl', muscles: 'Ischio-jambiers', gif: 'leg_curl', lower: false,
    cues: ['Hanches plaquées au banc', 'Contraction 1 s en haut', 'Descente en 3 s'],
    quip: 'Des ischios comme des câbles d\'ascenseur.'
  },
  calf_raise: {
    name: 'Mollets debout', muscles: 'Mollets', gif: 'calf_raise', lower: true,
    cues: ['Étirement complet 2 s en bas', 'Monte sur la pointe, pause en haut', 'Genoux tendus mais pas verrouillés'],
    quip: 'Les mollets ne mentent jamais. Ils boudent.'
  },
  hanging_leg_raise: {
    name: 'Relevés de jambes suspendu', muscles: 'Abdos · fléchisseurs de hanche', gif: 'hanging_leg_raise', lower: false,
    cues: ['Pas de balancier', 'Enroule le bassin en haut', 'Descente contrôlée'],
    quip: 'Le six-pack se commande ici.'
  },
  front_squat: {
    name: 'Front squat', muscles: 'Quadriceps · haut du dos', gif: 'front_squat', lower: true,
    cues: ['Coudes hauts, barre sur les deltoïdes', 'Buste le plus vertical possible', 'Descends entre les talons'],
    quip: 'Le squat qui ne pardonne pas les coudes paresseux.'
  },
  bulgarian: {
    name: 'Fentes bulgares', muscles: 'Quadriceps · fessiers', gif: 'bulgarian', lower: true,
    cues: ['Pied arrière sur le banc, lacets en bas', 'Genou avant qui avance légèrement', 'Reps notées par jambe'],
    quip: 'Inventées par quelqu\'un qui te veut du mal.'
  },
  hip_thrust: {
    name: 'Hip thrust', muscles: 'Fessiers', gif: 'hip_thrust', lower: true,
    cues: ['Haut du dos sur le banc, menton rentré', 'Tibias verticaux en haut', 'Serre les fessiers 1 s, pas de cambrure'],
    quip: 'Pousse le monde vers le plafond.'
  },
  leg_extension: {
    name: 'Leg extension', muscles: 'Quadriceps', gif: 'leg_extension', lower: false,
    cues: ['Genou aligné avec l\'axe de la machine', 'Contraction 1 s en haut', 'Dernière série : drop set'],
    quip: 'Les quads en goutte d\'eau. ICH !'
  }
};

// Couleurs de séance : Push = rouge, Pull = bleu, Legs = vert
export const SESSIONS = {
  pushA: {
    id: 'pushA', type: 'push', title: 'PUSH A', subtitle: 'Force — pecs, épaules, triceps',
    exercises: [
      { ex: 'db_bench',      sets: 4, reps: '6-8',   rest: 150, rpe: 8,   tempo: '3-1-1' },
      { ex: 'ohp',           sets: 3, reps: '6-8',   rest: 150, rpe: 8,   tempo: '2-0-X' },
      { ex: 'incline_db',    sets: 3, reps: '8-10',  rest: 120, rpe: 8.5, tempo: '3-1-1' },
      { ex: 'dips',          sets: 3, reps: '8-10',  rest: 120, rpe: 8.5, tempo: '2-1-1' },
      { ex: 'lateral_raise', sets: 4, reps: '12-15', rest: 60,  rpe: 9,   tempo: '2-0-2' },
      { ex: 'pushdown',      sets: 3, reps: '10-12', rest: 60,  rpe: 9,   tempo: '2-0-1' }
    ]
  },
  pullA: {
    id: 'pullA', type: 'pull', title: 'PULL A', subtitle: 'Force — dos, arrière d\'épaules, biceps',
    exercises: [
      { ex: 'deadlift',    sets: 4, reps: '3-5',   rest: 210, rpe: 8,   tempo: '1-0-X' },
      { ex: 'pullup',      sets: 4, reps: '6-8',   rest: 150, rpe: 8,   tempo: '2-0-1' },
      { ex: 'bb_row',      sets: 3, reps: '6-8',   rest: 120, rpe: 8,   tempo: '2-1-1' },
      { ex: 'face_pull',   sets: 3, reps: '15-20', rest: 60,  rpe: 8.5, tempo: '2-1-1' },
      { ex: 'ez_curl',     sets: 3, reps: '8-10',  rest: 75,  rpe: 9,   tempo: '3-0-1' },
      { ex: 'hammer_curl', sets: 3, reps: '10-12', rest: 60,  rpe: 9,   tempo: '2-0-1' }
    ]
  },
  legsA: {
    id: 'legsA', type: 'legs', title: 'LEGS A', subtitle: 'Force — quads, ischios, mollets',
    exercises: [
      { ex: 'squat',             sets: 5, reps: '4-6',   rest: 210, rpe: 8,   tempo: '2-1-X' },
      { ex: 'rdl',               sets: 3, reps: '6-8',   rest: 150, rpe: 8,   tempo: '3-0-1' },
      { ex: 'leg_press',         sets: 3, reps: '10-12', rest: 120, rpe: 8.5, tempo: '2-1-1' },
      { ex: 'leg_curl',          sets: 3, reps: '10-12', rest: 75,  rpe: 9,   tempo: '3-1-1' },
      { ex: 'calf_raise',        sets: 4, reps: '8-12',  rest: 60,  rpe: 9,   tempo: '2-2-1' },
      { ex: 'hanging_leg_raise', sets: 3, reps: '10-15', rest: 60,  rpe: 9,   tempo: '2-0-2' }
    ]
  },
  pushB: {
    id: 'pushB', type: 'push', title: 'PUSH B', subtitle: 'Hypertrophie — volume & congestion',
    exercises: [
      { ex: 'incline_bb',      sets: 4, reps: '6-8',   rest: 150, rpe: 8,   tempo: '3-1-1' },
      { ex: 'seated_db_press', sets: 3, reps: '8-10',  rest: 120, rpe: 8.5, tempo: '2-0-1' },
      { ex: 'cable_fly',       sets: 3, reps: '12-15', rest: 75,  rpe: 9,   tempo: '2-1-2' },
      { ex: 'lateral_raise',   sets: 5, reps: '15-20', rest: 45,  rpe: 9.5, tempo: '2-0-2', note: 'Dernière série en myo-reps' },
      { ex: 'skullcrusher',    sets: 3, reps: '8-10',  rest: 90,  rpe: 8.5, tempo: '3-0-1' },
      { ex: 'pushdown',        sets: 3, reps: '12-15', rest: 60,  rpe: 9.5, tempo: '2-0-1', note: 'Drop set sur la dernière série' }
    ]
  },
  pullB: {
    id: 'pullB', type: 'pull', title: 'PULL B', subtitle: 'Hypertrophie — largeur & détails',
    exercises: [
      { ex: 'db_row',        sets: 4, reps: '8-10',  rest: 120, rpe: 8.5, tempo: '2-1-2' },
      { ex: 'lat_pulldown',  sets: 3, reps: '10-12', rest: 90,  rpe: 8.5, tempo: '2-1-2' },
      { ex: 'rear_delt_fly', sets: 4, reps: '15-20', rest: 45,  rpe: 9.5, tempo: '2-0-2' },
      { ex: 'face_pull',     sets: 3, reps: '15',    rest: 60,  rpe: 9,   tempo: '2-1-1' },
      { ex: 'incline_curl',  sets: 3, reps: '10-12', rest: 75,  rpe: 9,   tempo: '3-0-1' },
      { ex: 'shrug',         sets: 3, reps: '12-15', rest: 60,  rpe: 9,   tempo: '1-1-1' }
    ]
  },
  legsB: {
    id: 'legsB', type: 'legs', title: 'LEGS B', subtitle: 'Hypertrophie — quads, fessiers, ischios',
    exercises: [
      { ex: 'front_squat',   sets: 4, reps: '6-8',   rest: 180, rpe: 8,   tempo: '3-1-X' },
      { ex: 'bulgarian',     sets: 3, reps: '8-10',  rest: 120, rpe: 8.5, tempo: '2-1-1', note: 'Reps par jambe' },
      { ex: 'hip_thrust',    sets: 3, reps: '8-12',  rest: 120, rpe: 8.5, tempo: '2-1-1' },
      { ex: 'leg_extension', sets: 3, reps: '12-15', rest: 60,  rpe: 9.5, tempo: '2-1-2', note: 'Drop set sur la dernière série' },
      { ex: 'leg_curl',      sets: 3, reps: '12-15', rest: 60,  rpe: 9.5, tempo: '2-1-2' },
      { ex: 'calf_raise',    sets: 4, reps: '15-20', rest: 45,  rpe: 9.5, tempo: '2-2-1' }
    ]
  }
};

// Lundi = index 0 … Dimanche = index 6
export const DEFAULT_WEEK = ['pushA', 'pullA', 'legsA', 'pushB', 'pullB', 'legsB', 'rest'];

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAY_SHORT = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

export const CYCLE_WEEKS = 5; // semaine 5 = deload

export const SHOUTS = [
  'ICH !!!', 'ICHHH !!!', 'ENCORE UNE !', 'LÉGER BÉBÉ !', 'C\'EST DE L\'AIR !',
  'PAS DE PITIÉ !', 'POUSSE !!!', 'TIRE !!!', 'ÇA BRÛLE ? TANT MIEUX !', 'ICH ICH ICH !'
];

export const REST_LINES = [
  'Respire. Bois. Regarde le chrono avec mépris.',
  'Le muscle se repose, l\'ego non.',
  'Shaker en main, regard de tueur.',
  'Récupère. La prochaine série sera pire.',
  'Pas de téléphone. Ah, si, c\'est moi le téléphone.'
];
