// Chargement et validation de kinan.config.json (partagé par les hooks et outils/verifier-config.js).
// Valeurs par défaut : config/kinan.config.defaut.json. Fichier de l'utilisateur : <dossier d'état>/kinan.config.json.
// Toute valeur invalide est remplacée par la valeur par défaut et signalée dans « alertes ». Ne lève jamais d'exception.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Dossier d'état et de configuration. KINAN_OS_DOSSIER le remplace (tests, ou dossier lu par le tableau de bord).
const DOSSIER = process.env.KINAN_OS_DOSSIER || path.join(os.homedir(), '.kinan-os');
const F_DEFAUT = path.join(__dirname, '..', '..', 'config', 'kinan.config.defaut.json');
const F_UTILISATEUR = path.join(DOSSIER, 'kinan.config.json');
const PLUGIN = 'kinan-orchestre';

const MODELES = ['haiku', 'sonnet', 'opus', 'inherit'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const BASES = ['lecture', 'production', 'expert'];
const MAX_AGENTS = 8;
const PAR_BASE = {
  lecture: { modele: 'haiku', effort: 'low', effortHaut: 'medium' },
  production: { modele: 'sonnet', effort: 'medium', effortHaut: 'high' },
  expert: { modele: 'opus', effort: 'high', effortHaut: 'xhigh' }
};

// Texte injecté dans le contexte : une ligne, sans balises, longueur bornée.
const propre = (t, n) => String(t == null ? '' : t).replace(/[\r\n\t]+/g, ' ').replace(/[<>`]/g, '').trim().slice(0, n);
const entier = (v, min, max, d) => (Number.isInteger(v) && v >= min && v <= max ? v : d);
const couleur = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);

function lireJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); }

function charger() {
  const alertes = [];
  let d;
  try { d = lireJson(F_DEFAUT); } catch { d = { agents: {}, relais: {}, sons: {}, textes: {}, juge: {} }; alertes.push('valeurs par défaut introuvables'); }
  let u = {};
  try { if (fs.existsSync(F_UTILISATEUR)) u = lireJson(F_UTILISATEUR); } catch { alertes.push('kinan.config.json illisible : valeurs par défaut utilisées'); u = {}; }
  if (!u || typeof u !== 'object' || Array.isArray(u)) u = {};

  // Juge : verrouillé (nom « Kinan », rôle de contrôle). Seuls couleur et avatar sont réglables.
  const uj = u.juge && typeof u.juge === 'object' ? u.juge : {};
  if (uj.nom !== undefined || uj.role !== undefined || uj.modele !== undefined) alertes.push('juge : nom, rôle et modèle verrouillés, valeurs ignorées');
  const juge = { id: 'kinan', nom: 'Kinan', couleur: couleur(uj.couleur) || couleur((d.juge || {}).couleur), avatar: propre(uj.avatar || (d.juge || {}).avatar, 200) || null };

  // Agents : la liste de l'utilisateur, si elle existe, remplace celle par défaut (ajout, retrait, renommage).
  const source = u.agents && typeof u.agents === 'object' && !Array.isArray(u.agents) ? u.agents : d.agents || {};
  const agents = [];
  for (const [id, a] of Object.entries(source)) {
    if (agents.length >= MAX_AGENTS) { alertes.push(`plus de ${MAX_AGENTS} agents : les suivants sont ignorés`); break; }
    if (id === 'kinan') { alertes.push('« kinan » est réservé au juge'); continue; }
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(id)) { alertes.push(`identifiant d'agent invalide : ${propre(id, 30)}`); continue; }
    if (!a || typeof a !== 'object' || a.actif === false) continue;
    const def = (d.agents || {})[id] || {};
    let base = typeof a.base === 'string' ? a.base : def.base;
    if (!BASES.includes(base) && !/^[a-z][a-z0-9:-]{0,63}$/.test(String(base || ''))) { alertes.push(`${id} : base invalide, « production » utilisée`); base = 'production'; }
    if (a.modele !== undefined && !MODELES.includes(a.modele)) alertes.push(`${id} : modèle inconnu, modèle de la base utilisé`);
    const pb = PAR_BASE[base] || { modele: 'inherit', effort: 'medium', effortHaut: 'high' }; // repli selon la base
    const modele = MODELES.includes(a.modele) ? a.modele : MODELES.includes(def.modele) ? def.modele : pb.modele;
    const effort = EFFORTS.includes(a.effort) ? a.effort : EFFORTS.includes(def.effort) ? def.effort : pb.effort;
    const effortHaut = EFFORTS.includes(a.effortHaut) ? a.effortHaut : EFFORTS.includes(def.effortHaut) ? def.effortHaut : pb.effortHaut;
    agents.push({
      id, base, modele, effort, effortHaut,
      type: BASES.includes(base) ? `${PLUGIN}:${base}` : base,
      nom: propre(a.nom || def.nom || id, 24),
      role: propre(a.role || def.role || '', 160),
      couleur: couleur(a.couleur) || couleur(def.couleur),
      avatar: propre(a.avatar || def.avatar, 200) || null
    });
  }
  if (!agents.length) alertes.push('aucun agent actif : le juge travaille seul');

  const ur = u.relais || {}, dr = d.relais || {};
  const relais = {
    minutes: entier(ur.minutes, 10, 1440, entier(dr.minutes, 10, 1440, 120)),
    jetons: entier(ur.jetons, 50000, 2000000, entier(dr.jetons, 50000, 2000000, 300000)),
    intervalleMinutes: entier(ur.intervalleMinutes, 5, 240, entier(dr.intervalleMinutes, 5, 240, 20))
  };
  const sons = { ...(d.sons || {}), ...(u.sons && typeof u.sons === 'object' ? u.sons : {}) }; // lus par le tableau de bord seulement
  const ut = u.textes || {}, dt = d.textes || {};
  const phrases = (Array.isArray(ut.phrasesTravail) ? ut.phrasesTravail : dt.phrasesTravail || []).slice(0, 10).map((p) => propre(p, 60)).filter(Boolean);
  const textes = { phrasesTravail: phrases.length ? phrases : ['Je travaille'], rappel: propre(ut.rappel || dt.rappel, 400) || null };

  return { dossier: DOSSIER, fichier: F_UTILISATEUR, juge, agents, relais, sons, textes, alertes };
}

// Nom d'agent reçu des hooks (« kinan-orchestre:lecture », « drafion »…) -> identifiant de configuration, ou null.
function idAgent(cfg, nom) {
  const s = String(nom || '');
  if (!s) return null;
  if (s === 'kinan' || s === `${PLUGIN}:kinan`) return 'kinan';
  const direct = cfg.agents.find((a) => a.id === s);
  if (direct) return direct.id;
  const parBase = cfg.agents.find((a) => a.type === s || `${PLUGIN}:${a.base}` === s); // repli : premier agent de cette base
  return parBase ? parBase.id : null;
}

module.exports = { charger, idAgent, PLUGIN, MODELES, EFFORTS, BASES };
