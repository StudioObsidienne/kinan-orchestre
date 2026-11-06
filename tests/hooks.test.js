// Comportement normal des hooks (événements simulés, dossier d'état temporaire).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { HOOK, OUTIL, dossierTemp, lancer, lireJson, existe } = require('./aide');

const ETAT = HOOK('etat.js');
const ev = (d, nom, plus = {}) => ({ hook_event_name: nom, session_id: 's1', cwd: d, ...plus });
const mission = (d, description, type = 'kinan-orchestre:production') => ev(d, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: type, description } });

test('SessionStart : équipe annoncée, état initial écrit, rien sur la sortie d\'erreur', (t) => {
  const d = dossierTemp(t);
  const s = lancer(HOOK('session.js'), ev(d, 'SessionStart', { source: 'startup' }), d);
  assert.strictEqual(s.status, 0);
  assert.strictEqual(s.stderr, '');
  assert.match(s.stdout, /ÉQUIPE KINAN/);
  assert.match(s.stdout, /drafion .*subagent_type kinan-orchestre:lecture/);
  const r = lancer(ETAT, ev(d, 'SessionStart'), d);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  const etat = lireJson(d, 'state.json');
  assert.strictEqual(etat.session, 's1');
  assert.strictEqual(etat.agents.kinan.etat, 'repos');
  assert.strictEqual(lireJson(d, 'sessions.json').s1.etat, 'repos');
  assert.ok(!existe(d, 'state.lock'), 'verrou libéré');
});

test('mission : tâche créée, liée à l\'agent au démarrage, terminée avec son heure de fin', (t) => {
  const d = dossierTemp(t);
  lancer(ETAT, mission(d, 'skyze : refaire la page contact'), d);
  let etat = lireJson(d, 'state.json');
  assert.strictEqual(etat.agents.skyze.etat, 'travail');
  assert.strictEqual(etat.agents.skyze.tache, 'skyze : refaire la page contact');
  let taches = lireJson(d, 'taches.json').taches;
  assert.strictEqual(taches.length, 1);
  assert.strictEqual(taches[0].statut, 'en cours');

  lancer(ETAT, ev(d, 'SubagentStart', { agent_type: 'kinan-orchestre:production', agent_id: 'a1' }), d);
  assert.strictEqual(lireJson(d, 'taches.json').taches[0].agentId, 'a1');
  assert.strictEqual(lireJson(d, 'state.json').agents.skyze.instances.length, 1);

  lancer(ETAT, ev(d, 'SubagentStop', { agent_type: 'kinan-orchestre:production', agent_id: 'a1' }), d);
  taches = lireJson(d, 'taches.json').taches;
  assert.strictEqual(taches[0].statut, 'fait');
  assert.ok(Number.isFinite(taches[0].fin));
  etat = lireJson(d, 'state.json');
  assert.strictEqual(etat.agents.skyze.etat, 'repos');
  assert.strictEqual(etat.agents.skyze.instances, undefined);
});

test('deux exemplaires du même agent : chacun termine sa propre tâche', (t) => {
  const d = dossierTemp(t);
  lancer(ETAT, mission(d, 'skyze : tâche A'), d);
  lancer(ETAT, ev(d, 'SubagentStart', { agent_type: 'kinan-orchestre:production', agent_id: 'a1' }), d);
  lancer(ETAT, mission(d, 'skyze : tâche B'), d);
  lancer(ETAT, ev(d, 'SubagentStart', { agent_type: 'kinan-orchestre:production', agent_id: 'a2' }), d);
  assert.strictEqual(lireJson(d, 'state.json').agents.skyze.instances.length, 2);
  lancer(ETAT, ev(d, 'SubagentStop', { agent_type: 'kinan-orchestre:production', agent_id: 'a2' }), d);
  const etat = lireJson(d, 'state.json');
  assert.strictEqual(etat.agents.skyze.etat, 'travail', 'l\'autre exemplaire travaille encore');
  const taches = lireJson(d, 'taches.json').taches;
  assert.deepStrictEqual(taches.map((x) => [x.titre, x.statut]), [['skyze : tâche A', 'en cours'], ['skyze : tâche B', 'fait']]);
});

test('SendMessage à un identifiant connu : nouvelle tâche liée à cet agent', (t) => {
  const d = dossierTemp(t);
  lancer(ETAT, ev(d, 'SubagentStart', { agent_type: 'kinan-orchestre:lecture', agent_id: 'x9' }), d);
  lancer(ETAT, ev(d, 'PreToolUse', { tool_name: 'SendMessage', tool_input: { to: 'x9', summary: 'vérifie aussi la page 2' } }), d);
  assert.strictEqual(lireJson(d, 'state.json').agents.drafion.tache, 'vérifie aussi la page 2');
  const t0 = lireJson(d, 'taches.json').taches.find((x) => x.titre === 'vérifie aussi la page 2');
  assert.ok(t0);
  assert.strictEqual(t0.agentId, 'x9');
});

test('question à l\'utilisateur, attente, erreur d\'outil, fin de tour', (t) => {
  const d = dossierTemp(t);
  lancer(ETAT, ev(d, 'PreToolUse', { tool_name: 'AskUserQuestion', tool_input: { questions: [{ question: 'On publie ?', options: [{ label: 'Oui' }, { label: 'Non' }] }] } }), d);
  assert.deepStrictEqual(lireJson(d, 'state.json').agents.kinan.question, { texte: 'On publie ?', options: ['Oui', 'Non'] });
  lancer(ETAT, ev(d, 'Notification'), d);
  assert.strictEqual(lireJson(d, 'sessions.json').s1.etat, 'doute');
  lancer(ETAT, ev(d, 'PostToolUseFailure'), d);
  assert.strictEqual(lireJson(d, 'state.json').agents.kinan.etat, 'erreur');
  lancer(ETAT, ev(d, 'Stop'), d);
  assert.strictEqual(lireJson(d, 'state.json').agents.kinan.etat, 'repos');
});

test('événement non suivi : aucun fichier écrit', (t) => {
  const d = dossierTemp(t);
  const r = lancer(ETAT, ev(d, 'PostToolUse', { tool_name: 'Read' }), d);
  assert.strictEqual(r.status, 0);
  assert.ok(!existe(d, 'state.json'));
});

test('outils/verifier-config.js : configuration par défaut valide', (t) => {
  const d = dossierTemp(t);
  const r = lancer(OUTIL('verifier-config.js'), '', d);
  assert.strictEqual(r.status, 0, r.stdout);
  assert.match(r.stdout, /Configuration valide\./);
});
