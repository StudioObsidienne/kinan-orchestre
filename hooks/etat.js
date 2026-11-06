// Hook Claude Code : met à jour <dossier d'état>/state.json (0 jeton, ne bloque jamais Claude).
// Déclaré dans hooks/hooks.json du plugin ; l'événement arrive en JSON sur l'entrée standard. Aucun accès réseau.
const fs = require('fs');
const path = require('path');

// Dossier d'état : ~/.kinan-os par défaut, remplacé par KINAN_OS_DOSSIER (voir hooks/lib/config.js).
const config = require('./lib/config');
const CFG = config.charger();
const DOSSIER = CFG.dossier;
const FICHIER = path.join(DOSSIER, 'state.json');
const AGENTS = ['kinan', ...CFG.agents.map((a) => a.id)];

const PHRASES = CFG.textes.phrasesTravail;
const court =(t, n = 48) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
const cle = (nom) => config.idAgent(CFG, nom);
// Mission confiée par l'outil Agent : la description commence par « <id> : » (règle du juge) ; sinon, d'après le type d'agent.
const agentDeMission = (ti) => { const m = /^\s*([a-z][a-z0-9-]{0,23})\s*:/.exec(String(ti.description || '')); return (m && AGENTS.includes(m[1]) && m[1] !== 'kinan') ? m[1] : cle(ti.subagent_type); };

// Écriture atomique : fichier temporaire puis renommage.
function ecrireAtomique(f, contenu) {
  const tmp = f + '.' + process.pid + '.' + Date.now() + '.tmp';
  try {
  fs.writeFileSync(tmp, contenu);
  for (let i = 0; ; i++) { // 3 essais espacés de 50 ms (EPERM/EBUSY sous Windows)
    try { fs.renameSync(tmp, f); return; } catch (e) {
      if (i >= 2 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) { try { fs.unlinkSync(tmp); } catch {} throw e; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  } catch (e) { try { fs.unlinkSync(tmp); } catch {} throw e; }
}

function lire() {
  try { return JSON.parse(fs.readFileSync(FICHIER, 'utf8')); } catch { return { agents: {} }; }
}

function ecrire(etat) {
  fs.mkdirSync(DOSSIER, { recursive: true });
  ecrireAtomique(FICHIER, JSON.stringify(etat, null, 2));
}

// Journal des événements (<dossier d'état>/historique.jsonl), 2000 dernières lignes. Silencieux.
function journal(agent, etat, tache) {
  try {
    const f = path.join(DOSSIER, 'historique.jsonl');
    let lignes = [];
    try { lignes = fs.readFileSync(f, 'utf8').split(String.fromCharCode(10)).filter(Boolean); } catch {}
    lignes.push(JSON.stringify({ t: Date.now(), agent, etat, tache }));
    ecrireAtomique(f, lignes.slice(-2000).join(String.fromCharCode(10)) + String.fromCharCode(10));
  } catch { /* jamais bloquant */ }
}

// Correspondance identifiant de sous-agent -> agent (pour reconnaître à qui est adressé un SendMessage).
const F_IDS = path.join(DOSSIER, 'agents-ids.json');
function memoriserId(id, agent) {
  try {
    if (!id || !agent) return;
    let d = {}; try { d = JSON.parse(fs.readFileSync(F_IDS, 'utf8')); } catch {}
    d[String(id)] = agent;
    const cles = Object.keys(d); if (cles.length > 200) delete d[cles[0]];
    ecrireAtomique(F_IDS, JSON.stringify(d));
  } catch { /* silencieux */ }
}
function idVersCle(to) {
  try {
    if (!to) return null;
    const direct = cle(String(to)); if (direct) return direct;
    return cle(JSON.parse(fs.readFileSync(F_IDS, 'utf8'))[String(to)]);
  } catch { return null; }
}

// Chaque mission confiée à un agent est inscrite dans taches.json (lu par le tableau de bord optionnel) : historique de ce qui a été demandé.
// debut / fin : horodatages réels en ms. agentId : identifiant du sous-agent qui exécute la tâche (connu dès SubagentStart,
// ou tout de suite pour un SendMessage adressé à un identifiant).
const F_TACHES = path.join(DOSSIER, 'taches.json');
function lireTaches() {
  let d; try { d = JSON.parse(fs.readFileSync(F_TACHES, 'utf8')); } catch { d = { taches: [] }; }
  d.taches = Array.isArray(d.taches) ? d.taches : [];
  return d;
}
function ajouterTache(agent, titre, agentId) {
  try {
    if (!agent || !titre) return;
    const d = lireTaches();
    if (d.taches.some((x) => x.agent === agent && x.titre === titre && x.statut === 'en cours')) return; // pas de doublon
    const id = d.taches.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    const t = { id, titre, agent, statut: 'en cours', cree: new Date().toISOString().slice(0, 10), origine: 'mission', debut: Date.now() };
    if (agentId) t.agentId = String(agentId);
    d.taches.push(t);
    ecrireAtomique(F_TACHES, JSON.stringify(d, null, 2));
  } catch { /* jamais bloquant */ }
}

// SubagentStart : l'identifiant est rattaché à la plus ancienne tâche « en cours » de cet agent qui n'en a pas encore.
function lierAgentId(agent, agentId) {
  try {
    if (!agent || !agentId) return;
    const d = lireTaches();
    if (d.taches.some((x) => x.agentId === String(agentId) && x.statut === 'en cours')) return; // déjà lié (reprise)
    const t = d.taches.find((x) => x.agent === agent && x.statut === 'en cours' && !x.agentId);
    if (!t) return;
    t.agentId = String(agentId);
    ecrireAtomique(F_TACHES, JSON.stringify(d, null, 2));
  } catch { /* jamais bloquant */ }
}

// Fin de mission : les tâches « en cours » liées à cet identifiant passent à « fait » avec leur heure de fin.
// Repli : la plus ancienne tâche « en cours » non liée de l'agent ; sans identifiant du tout, la plus ancienne « en cours »
// (jamais la tâche liée à un autre exemplaire encore actif quand l'identifiant est connu).
function marquerFait(agent, agentId) {
  try {
    if (!agent) return;
    const d = lireTaches();
    const enCours = d.taches.filter((x) => x.agent === agent && x.statut === 'en cours');
    let cibles = agentId ? enCours.filter((x) => x.agentId === String(agentId)) : [];
    if (!cibles.length) { const t = enCours.find((x) => !x.agentId) || (agentId ? null : enCours[0]); if (t) cibles = [t]; }
    if (!cibles.length) return;
    const fin = Date.now();
    for (const t of cibles) { t.statut = 'fait'; t.fin = fin; }
    ecrireAtomique(F_TACHES, JSON.stringify(d, null, 2));
  } catch { /* jamais bloquant */ }
}

// Verrou simple par fichier (création exclusive), avec attente courte et reprise d'un verrou périmé.
const F_VERROU = path.join(DOSSIER, 'state.lock');
let jeton = null; // propriétaire du verrou : on ne libère que le sien
function prendreVerrou() {
  fs.mkdirSync(DOSSIER, { recursive: true });
  const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let i = 0; i < 60; i++) { // ~1,5 s au maximum
    try {
      const fd = fs.openSync(F_VERROU, 'wx');
      jeton = process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      try { fs.writeSync(fd, jeton); } catch { // verrou sans propriétaire : on le retire et on réessaie
        try { fs.closeSync(fd); } catch {} try { fs.unlinkSync(F_VERROU); } catch {} jeton = null; pause(25); continue;
      }
      return fd;
    } catch {
      try { if (Date.now() - fs.statSync(F_VERROU).mtimeMs > 3000) { const avant = fs.readFileSync(F_VERROU, 'utf8'); if (fs.readFileSync(F_VERROU, 'utf8') === avant) fs.unlinkSync(F_VERROU); } } catch {}
      pause(25);
    }
  }
  return null; // on continue quand même : mieux vaut un état légèrement faux qu'un hook bloqué
}
function libererVerrou(fd) {
  if (fd === null || fd === undefined) return;
  try { fs.closeSync(fd); } catch {}
  try { if (fs.readFileSync(F_VERROU, 'utf8') === jeton) fs.unlinkSync(F_VERROU); } catch {}
}

function regler(etat, agent, valeurs) {
  if (!agent) return;
  etat.agents = etat.agents || {};
  const avant = etat.agents[agent] || {};
  // « instances » : exemplaires (clones) de cet agent actifs en même temps ; conservées d'un événement à l'autre.
  etat.agents[agent] = { etat: 'repos', tache: '', ...(avant.instances ? { instances: avant.instances } : {}), ...valeurs, maj: Date.now() };
  if (valeurs.instances === undefined && valeurs.etat === 'repos') delete etat.agents[agent].instances;
  journal(agent, etat.agents[agent].etat, etat.agents[agent].tache);
}

// Registre de toutes les conversations (<dossier d'état>/sessions.json) : permet de suivre plusieurs projets en même temps.
function majSessions(e, etat) {
  try {
    if (!e.session_id) return;
    const f = path.join(DOSSIER, 'sessions.json');
    let d = {}; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
    const ev = e.hook_event_name, ti = e.tool_input || {};
    const s = d[e.session_id] || { tache: '' };
    s.projet = path.basename(String(e.cwd || s.cwd || '')) || s.projet || 'projet';
    s.cwd = e.cwd || s.cwd; s.transcript = e.transcript_path || s.transcript; s.maj = Date.now();
    if (ev === 'Stop' || ev === 'SessionStart') { s.etat = 'repos'; s.tache = ''; }
    else if (ev === 'Notification') { s.etat = 'doute'; s.tache = "J'attends ton feu vert"; }
    else if (ev === 'PostToolUseFailure') { s.etat = 'erreur'; s.tache = 'Petit accroc'; }
    else {
      s.etat = 'travail';
      if (ev === 'UserPromptSubmit') s.tache = 'Au travail…';
      else if (ev === 'PreToolUse' && e.tool_name === 'Agent') s.tache = court((ti.subagent_type || 'agent') + ' : ' + (ti.description || ''), 70);
      else if (ev === 'SubagentStart') { const k = cle(e.agent_type); if (k && etat.agents && etat.agents[k]) s.tache = court(k + ' : ' + etat.agents[k].tache, 70); }
    }
    d[e.session_id] = s;
    for (const k of Object.keys(d)) if (Date.now() - (d[k].maj || 0) > 24 * 3600 * 1000) delete d[k];
    ecrireAtomique(f, JSON.stringify(d));
  } catch { /* silencieux */ }
}

let brut = '';
process.stdin.on('data', (d) => (brut += d));
process.stdin.on('end', () => {
  let verrou = null;
  try {
    const e = JSON.parse(brut || '{}');
    verrou = prendreVerrou(); // évite que deux hooks simultanés s'écrasent l'un l'autre
    const etat = lire();
    // Changement de conversation : on repart d'un état propre (les agents de l'ancienne conversation repassent au repos).
    if (e.session_id && etat.session !== e.session_id) {
      if (etat.session) for (const k of Object.keys(etat.agents || {})) { etat.agents[k] = { etat: 'repos', tache: '', maj: Date.now() }; }
      etat.session = e.session_id;
    }
    if (e.transcript_path) etat.transcript = e.transcript_path;
    switch (e.hook_event_name) {
      case 'SessionStart':
        regler(etat, 'kinan', { etat: 'repos' });
        break;
      case 'UserPromptSubmit':
        // Jamais le texte de l'utilisateur dans l'interface : une petite phrase d'ambiance suffit.
        regler(etat, 'kinan', { etat: 'travail', tache: PHRASES[Math.floor(Math.random() * PHRASES.length)] });
        break;
      case 'PreToolUse': {
        const ti = e.tool_input || {};
        if (e.tool_name === 'SendMessage') { // nouvelle consigne à un agent déjà lancé : on affiche le résumé de la consigne
          const k = idVersCle(ti.to);
          if (k && (ti.summary || ti.message)) {
            const titre = court(ti.summary || String(ti.message).split('\n')[0], 60);
            regler(etat, k, { etat: 'travail', tache: titre });
            ajouterTache(k, court(titre, 90), cle(String(ti.to)) ? null : ti.to); // « to » est un identifiant (pas un nom) : lien direct
          }
        } else if (e.tool_name === 'AskUserQuestion') { // Le juge pose une question à l'utilisateur : l'interface l'affiche
          const q = (Array.isArray(ti.questions) ? ti.questions[0] : null) || {};
          regler(etat, 'kinan', {
            etat: 'doute', tache: 'J\'ai une question pour toi',
            question: { texte: court(q.question, 200), options: (q.options || []).slice(0, 4).map((o) => court(o.label, 40)) }
          });
        } else { // outil Agent : on retient la description de la mission
          const k = agentDeMission(ti);
          regler(etat, k, { etat: 'travail', tache: court(ti.description) || 'Mission reçue' });
          ajouterTache(k, court(ti.description, 90));
        }
        break;
      }
      case 'SubagentStart': {
        const k = cle(e.agent_type);
        memoriserId(e.agent_id, k);
        if (!k) break;
        lierAgentId(k, e.agent_id);
        const tache = (etat.agents?.[k]?.tache) || 'Au travail…';
        const id = String(e.agent_id || ('anonyme-' + Date.now()));
        const maintenant = Date.now();
        // Exemplaires actifs : on oublie ceux sans nouvelle depuis 1 h (arrêt non signalé), on ajoute ou met à jour celui-ci.
        const inst = ((etat.agents?.[k]?.instances) || []).filter((x) => maintenant - (x.maj || x.depuis || 0) < 3600 * 1000);
        const existant = inst.find((x) => x.id === id);
        if (existant) { existant.tache = tache; existant.maj = maintenant; } else {
          inst.push({ id, tache, depuis: maintenant, maj: maintenant });
          if (inst.length >= 2) journal(k, 'clone', `Exemplaire n°${inst.length} déployé : ${tache}`);
        }
        regler(etat, k, { etat: 'travail', tache, instances: inst });
        break;
      }
      case 'SubagentStop': {
        const k = cle(e.agent_type);
        if (!k) break;
        const id = e.agent_id ? String(e.agent_id) : null;
        let inst = (etat.agents?.[k]?.instances) || [];
        inst = id ? inst.filter((x) => x.id !== id) : inst.slice(1); // sans identifiant : le plus ancien se termine
        if (inst.length) regler(etat, k, { etat: 'travail', tache: inst[inst.length - 1].tache, instances: inst }); // d'autres exemplaires travaillent encore
        else regler(etat, k, { etat: 'repos' });
        marquerFait(k, id);
        break;
      }
      case 'PostToolUseFailure':
        regler(etat, 'kinan', { etat: 'erreur', tache: 'Petit accroc, je gère' });
        break;
      case 'Notification': // Claude attend une réponse ou une autorisation de l'utilisateur
        regler(etat, 'kinan', { etat: 'doute', tache: 'J\'attends ton feu vert' });
        break;
      case 'Stop':
        regler(etat, 'kinan', { etat: 'repos' });
        break;
      default:
        return;
    }
    ecrire(etat);
    majSessions(e, etat);
  } catch { /* un hook ne doit jamais gêner Claude */ }
  finally { libererVerrou(verrou); }
});
