// Plusieurs conversations : un fichier d'état par conversation (sessions/<sid>.json), miroir state.json, registre sessions.json.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { HOOK, dossierTemp, lancer, lireJson, ecrire, existe } = require('./aide');
const { nomSur } = require('../hooks/lib/fichiers');

const ETAT = HOOK('etat.js');
const ev = (d, sid, nom, plus = {}) => ({ hook_event_name: nom, session_id: sid, cwd: path.join(d, 'projet-' + sid), transcript_path: path.join(d, sid + '.jsonl'), ...plus });
const mission = (d, sid, agent, texte) => ev(d, sid, 'PreToolUse', { tool_name: 'Agent', tool_input: { subagent_type: 'kinan-orchestre:production', description: `${agent} : ${texte}` } });
const envoyer = (d, e) => { const r = lancer(ETAT, e, d); assert.strictEqual(r.status, 0); assert.strictEqual(r.stderr, ''); return r; };
const session = (d, sid) => lireJson(d, path.join('sessions', sid + '.json'));

test('deux conversations entrelacées gardent chacune leurs agents ; le miroir suit la dernière', (t) => {
  const d = dossierTemp(t);
  envoyer(d, mission(d, 'conv-A', 'skyze', 'page A'));
  envoyer(d, mission(d, 'conv-B', 'drafion', 'lecture B'));
  envoyer(d, ev(d, 'conv-A', 'Notification'));
  const a = session(d, 'conv-A'), b = session(d, 'conv-B');
  assert.strictEqual(a.agents.skyze.etat, 'travail');
  assert.strictEqual(a.agents.kinan.etat, 'doute');
  assert.ok(!a.agents.drafion, 'A ne voit pas les agents de B');
  assert.strictEqual(b.agents.drafion.etat, 'travail');
  assert.ok(!b.agents.skyze && !b.agents.kinan, 'B ne voit pas les agents de A');
  assert.strictEqual(a.session, 'conv-A');
  const m = lireJson(d, 'state.json');
  assert.strictEqual(m.session, 'conv-A');
  assert.strictEqual(m.agents.skyze.etat, 'travail');
  assert.strictEqual(m.agents.drafion.etat, 'repos', 'miroir : agents de l\'autre conversation au repos (comportement 0.2.2)');
  const reg = lireJson(d, 'sessions.json');
  assert.deepStrictEqual(Object.keys(reg).sort(), ['conv-A', 'conv-B']);
  assert.ok(Number.isFinite(reg['conv-A'].debut));
  assert.strictEqual(reg['conv-A'].projet, 'projet-conv-A');
});

test('SessionEnd : fin posée au registre, fichier de la conversation supprimé, miroir intact', (t) => {
  const d = dossierTemp(t);
  envoyer(d, mission(d, 'conv-A', 'skyze', 'page'));
  const avant = fs.readFileSync(path.join(d, 'state.json'), 'utf8');
  envoyer(d, ev(d, 'conv-A', 'SessionEnd'));
  assert.ok(!existe(d, path.join('sessions', 'conv-A.json')));
  assert.ok(Number.isFinite(lireJson(d, 'sessions.json')['conv-A'].fin));
  assert.strictEqual(fs.readFileSync(path.join(d, 'state.json'), 'utf8'), avant);
  envoyer(d, ev(d, 'conv-A', 'UserPromptSubmit'));
  assert.ok(!('fin' in lireJson(d, 'sessions.json')['conv-A']), 'conversation reprise');
});

test('identifiant hostile : ../x ne sort pas du dossier sessions/', (t) => {
  const d = dossierTemp(t);
  for (const sid of ['../x', '..\\..\\y', 'a/b', '', 'x'.repeat(65)]) envoyer(d, ev(d, sid, 'UserPromptSubmit'));
  assert.ok(!existe(d, 'x.json') && !fs.existsSync(path.join(d, '..', 'x.json')));
  const noms = fs.readdirSync(path.join(d, 'sessions'));
  for (const n of noms) assert.match(n, /^[A-Za-z0-9-]{1,64}\.json$/);
  assert.strictEqual(nomSur('../x'), nomSur('../x'));
  assert.notStrictEqual(nomSur('../x'), nomSur('../y'));
  assert.strictEqual(nomSur('2f1c-ABC'), '2f1c-ABC');
});

test('purge 24 h : registre et fichiers anciens ou orphelins supprimés', (t) => {
  const d = dossierTemp(t);
  fs.mkdirSync(path.join(d, 'sessions'));
  const vieux = Date.now() - 25 * 3600 * 1000;
  ecrire(d, 'sessions.json', { ancienne: { projet: 'p', maj: vieux } });
  ecrire(d, path.join('sessions', 'ancienne.json'), { agents: {} });
  ecrire(d, path.join('sessions', 'orpheline.json'), { agents: {} });
  fs.utimesSync(path.join(d, 'sessions', 'orpheline.json'), new Date(vieux), new Date(vieux));
  ecrire(d, path.join('sessions', 'recente.json'), { agents: {} }); // orpheline mais écrite à l'instant : gardée
  envoyer(d, ev(d, 'conv-A', 'UserPromptSubmit'));
  assert.deepStrictEqual(Object.keys(lireJson(d, 'sessions.json')), ['conv-A']);
  assert.deepStrictEqual(fs.readdirSync(path.join(d, 'sessions')).sort(), ['conv-A.json', 'recente.json']);
});

test('tâche de mission : porte sa conversation ; fin de mission dans la bonne conversation', (t) => {
  const d = dossierTemp(t);
  envoyer(d, mission(d, 'conv-A', 'skyze', 'même titre'));
  envoyer(d, mission(d, 'conv-B', 'skyze', 'même titre'));
  let taches = lireJson(d, 'taches.json').taches;
  assert.deepStrictEqual(taches.map((x) => x.session), ['conv-A', 'conv-B'], 'pas de doublon entre conversations');
  envoyer(d, ev(d, 'conv-B', 'SubagentStop', { agent_type: 'kinan-orchestre:production' }));
  taches = lireJson(d, 'taches.json').taches;
  assert.deepStrictEqual(taches.map((x) => x.statut), ['en cours', 'fait']);
  assert.strictEqual(session(d, 'conv-A').agents.skyze.etat, 'travail');
  assert.strictEqual(session(d, 'conv-B').agents.skyze.etat, 'repos');
  const histo = fs.readFileSync(path.join(d, 'historique.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(histo.every((h) => h.s === 'conv-A' || h.s === 'conv-B'));
});

test('ancien state.json de la même conversation repris au premier événement 0.3.0', (t) => {
  const d = dossierTemp(t);
  ecrire(d, 'state.json', { session: 'conv-A', agents: { skyze: { etat: 'travail', tache: 'x', maj: Date.now() } } });
  envoyer(d, ev(d, 'conv-A', 'UserPromptSubmit'));
  assert.strictEqual(session(d, 'conv-A').agents.skyze.etat, 'travail');
});

test('aucun fichier d\'état ne contient le texte du prompt', (t) => {
  const d = dossierTemp(t);
  const secret = 'TEXTE-SECRET-DU-PROMPT-1234';
  envoyer(d, ev(d, 'conv-A', 'UserPromptSubmit', { prompt: secret }));
  envoyer(d, ev(d, 'conv-B', 'UserPromptSubmit', { prompt: secret }));
  const tout = [];
  const parcourir = (r) => { for (const n of fs.readdirSync(r)) { const p = path.join(r, n); if (fs.statSync(p).isDirectory()) parcourir(p); else tout.push(fs.readFileSync(p, 'utf8')); } };
  parcourir(d);
  assert.ok(tout.length >= 4);
  for (const c of tout) assert.ok(!c.includes(secret));
});
