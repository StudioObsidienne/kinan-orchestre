// Concurrence : hooks lancés en même temps (plusieurs agents, plusieurs conversations) et réservation des fichiers du projet.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { HOOK, dossierTemp, lancer, lancerAsync, lireJson, ecrire, existe } = require('./aide');
const { traiter, DUREE } = require('../hooks/verrou-fichiers');

const N = 20;
const ev = (d, nom, plus = {}) => ({ hook_event_name: nom, session_id: 's1', cwd: d, ...plus });
const edition = (d, fichier, agentId, plus = {}) => ev(d, 'PreToolUse', { tool_name: 'Edit', tool_input: { file_path: fichier }, ...(agentId ? { agent_id: agentId, agent_type: 'kinan-orchestre:production' } : {}), ...plus });

test(`${N} hooks simultanés : aucune mission perdue, identifiants uniques, fichiers JSON valides`, async (t) => {
  const d = dossierTemp(t);
  const res = await Promise.all(Array.from({ length: N }, (_, i) => lancerAsync(HOOK('etat.js'),
    ev(d, 'PreToolUse', { session_id: 's' + (i % 3), tool_name: 'Agent', tool_input: { subagent_type: 'kinan-orchestre:production', description: `skyze : tâche ${i}` } }), d)));
  for (const r of res) { assert.strictEqual(r.status, 0); assert.strictEqual(r.stderr, ''); }
  const taches = lireJson(d, 'taches.json').taches;
  assert.strictEqual(taches.length, N);
  assert.deepStrictEqual(taches.map((x) => x.id).sort((a, b) => a - b), Array.from({ length: N }, (_, i) => i + 1));
  assert.strictEqual(new Set(taches.map((x) => x.titre)).size, N);
  lireJson(d, 'state.json');
  assert.deepStrictEqual(Object.keys(lireJson(d, 'sessions.json')).sort(), ['s0', 's1', 's2']);
  const histo = fs.readFileSync(path.join(d, 'historique.jsonl'), 'utf8').trim().split('\n');
  assert.strictEqual(histo.length, N);
  for (const l of histo) JSON.parse(l);
  assert.ok(!existe(d, 'state.lock'));
  assert.deepStrictEqual(fs.readdirSync(d).filter((f) => f.endsWith('.tmp')), [], 'aucun fichier temporaire oublié');
});

test('deux conversations simultanées : chacune garde ses agents, registre et fichiers valides', async (t) => {
  const d = dossierTemp(t);
  const agents = { A: 'skyze', B: 'drafion' };
  const res = await Promise.all(Array.from({ length: 16 }, (_, i) => { const c = i % 2 ? 'B' : 'A';
    return lancerAsync(HOOK('etat.js'), ev(d, 'PreToolUse', { session_id: 'conv-' + c, tool_name: 'Agent', tool_input: { subagent_type: 'kinan-orchestre:production', description: `${agents[c]} : tâche ${i}` } }), d); }));
  for (const r of res) { assert.strictEqual(r.status, 0); assert.strictEqual(r.stderr, ''); }
  const a = lireJson(d, path.join('sessions', 'conv-A.json')), b = lireJson(d, path.join('sessions', 'conv-B.json'));
  assert.deepStrictEqual(Object.keys(a.agents), ['skyze']);
  assert.deepStrictEqual(Object.keys(b.agents), ['drafion']);
  assert.ok(['conv-A', 'conv-B'].includes(lireJson(d, 'state.json').session));
  assert.deepStrictEqual(Object.keys(lireJson(d, 'sessions.json')).sort(), ['conv-A', 'conv-B']);
  const taches = lireJson(d, 'taches.json').taches;
  assert.strictEqual(taches.length, 16);
  for (const x of taches) assert.strictEqual(x.session, x.agent === 'skyze' ? 'conv-A' : 'conv-B');
  assert.ok(!existe(d, 'state.lock'));
  assert.deepStrictEqual(fs.readdirSync(path.join(d, 'sessions')).filter((f) => f.endsWith('.tmp')), []);
});

test('réservation : un second agent ne peut pas modifier un fichier réservé par un agent actif', (t) => {
  const d = dossierTemp(t);
  const f = path.join(d, 'src', 'page.html');
  assert.strictEqual(traiter(edition(d, f, 'a1'), d), null, 'premier agent : autorisé');
  assert.strictEqual(traiter(edition(d, f, 'a1'), d), null, 'même agent : autorisé');
  const refus = traiter(edition(d, f, 'a2'), d);
  assert.match(refus, /Fichier réservé/);
  assert.match(refus, /kinan-orchestre:production/);
  assert.match(traiter(edition(d, f, null), d), /Fichier réservé/, 'la conversation principale aussi');
  assert.strictEqual(traiter(edition(d, path.join(d, 'autre.css'), 'a2'), d), null, 'autre fichier : autorisé');
  traiter(ev(d, 'SubagentStop', { agent_id: 'a1' }), d);
  assert.strictEqual(traiter(edition(d, f, 'a2'), d), null, 'libéré à la fin du premier agent');
});

test('réservation : chemin relatif, casse (Windows et macOS), NotebookEdit, Write et MultiEdit désignent le même fichier', (t) => {
  const d = dossierTemp(t);
  traiter(edition(d, 'Notes.ipynb', 'a1'), d);
  const autre = process.platform === 'linux' ? path.join(d, 'Notes.ipynb') : path.join(d, 'NOTES.IPYNB');
  assert.match(traiter(ev(d, 'PreToolUse', { tool_name: 'NotebookEdit', tool_input: { notebook_path: autre }, agent_id: 'a2' }), d), /Fichier réservé/);
  for (const outil of ['Write', 'MultiEdit']) assert.match(traiter(ev(d, 'PreToolUse', { tool_name: outil, tool_input: { file_path: autre }, agent_id: 'a3' }), d), /Fichier réservé/, outil);
  assert.strictEqual(traiter(ev(d, 'PreToolUse', { tool_name: 'Read', tool_input: { file_path: autre }, agent_id: 'a3' }), d), null, 'lecture : jamais bloquée');
});

test('réservation : expirée après 10 min sans modification (agent muet), libérée par Stop pour la conversation', (t) => {
  const d = dossierTemp(t);
  const f = path.join(d, 'a.js');
  const t0 = Date.now();
  traiter(edition(d, f, 'a1'), d, t0);
  assert.match(traiter(edition(d, f, 'a2'), d, t0 + DUREE - 1000), /Fichier réservé/);
  assert.strictEqual(traiter(edition(d, f, 'a2'), d, t0 + DUREE + 1), null);
  const g = path.join(d, 'b.js');
  traiter(edition(d, g, null), d);
  assert.match(traiter(edition(d, g, 'a3'), d), /la conversation principale/);
  traiter(ev(d, 'Stop'), d);
  assert.strictEqual(traiter(edition(d, g, 'a3'), d), null);
});

test('réservation : deux conversations sur le même projet', (t) => {
  const d = dossierTemp(t);
  const f = path.join(d, 'index.html');
  traiter(edition(d, f, null, { session_id: 'conv-A' }), d);
  assert.match(traiter(edition(d, f, null, { session_id: 'conv-B' }), d), /une autre conversation/);
});

test('réservation : fichier de réservations corrompu, verrou indisponible ou outil sans chemin : jamais de refus', (t) => {
  const d = dossierTemp(t);
  const f = path.join(d, 'x.txt');
  for (const contenu of ['null', '[]', '{tronqué', JSON.stringify({ [f]: 'texte' })]) {
    ecrire(d, 'fichiers-verrous.json', contenu);
    assert.strictEqual(traiter(edition(d, f, 'a9'), d), null, contenu);
    fs.unlinkSync(path.join(d, 'fichiers-verrous.json'));
  }
  traiter(edition(d, f, 'a1'), d);
  ecrire(d, 'fichiers.lock', 'occupé');
  assert.strictEqual(traiter(edition(d, f, 'a2'), d), null, 'verrou non obtenu : on laisse passer');
  fs.unlinkSync(path.join(d, 'fichiers.lock'));
  assert.strictEqual(traiter(ev(d, 'PreToolUse', { tool_name: 'Edit', tool_input: {}, agent_id: 'a2' }), d), null);
});

test('réservation, processus réels : refus au format attendu par Claude Code', (t) => {
  const d = dossierTemp(t);
  const f = path.join(d, 'style.css');
  const r1 = lancer(HOOK('verrou-fichiers.js'), edition(d, f, 'a1'), d);
  assert.strictEqual(r1.status, 0);
  assert.strictEqual(r1.stdout, '');
  const r2 = lancer(HOOK('verrou-fichiers.js'), edition(d, f, 'a2'), d);
  assert.strictEqual(r2.status, 0);
  const o = JSON.parse(r2.stdout).hookSpecificOutput;
  assert.strictEqual(o.hookEventName, 'PreToolUse');
  assert.strictEqual(o.permissionDecision, 'deny');
  assert.match(o.permissionDecisionReason, /Fichier réservé/);
});

test('réservation : 10 agents modifient le même fichier au même instant, un seul passe', async (t) => {
  const d = dossierTemp(t);
  const f = path.join(d, 'commun.js');
  const res = await Promise.all(Array.from({ length: 10 }, (_, i) => lancerAsync(HOOK('verrou-fichiers.js'), edition(d, f, 'agent-' + i), d)));
  for (const r of res) { assert.strictEqual(r.status, 0); assert.strictEqual(r.stderr, ''); }
  const passes = res.filter((r) => r.stdout === '');
  assert.strictEqual(passes.length, 1, res.map((r) => r.stdout.slice(0, 40)).join(' | '));
  for (const r of res.filter((x) => x.stdout)) assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.ok(!existe(d, 'fichiers.lock'));
});
