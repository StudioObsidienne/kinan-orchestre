// Modèle du juge et des agents : Sonnet par défaut, choix explicite conservé, aucun repli silencieux vers Opus,
// mise à jour depuis une ancienne kinan.config.json sans perte de préférences. Aucun réseau.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { RACINE, HOOK, dossierTemp, lancer, ecrire } = require('./aide');

// charger() lu dans un processus neuf (le dossier d'état est fixé au chargement du module).
function charger(dossier) {
  const r = spawnSync(process.execPath, ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(path.join(RACINE, 'hooks', 'lib', 'config.js'))}).charger()))`],
    { env: { ...process.env, KINAN_OS_DOSSIER: dossier }, encoding: 'utf8', timeout: 15000 });
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

// Ancienne configuration (format antérieur, sans « version ») : agents personnalisés sans clé « modele »
// (repli « inherit » = modèle du chat principal, souvent Opus), juge.modele « opus » hérité, préférences diverses.
const ANCIENNE = {
  miseAJour: { verifier: true },
  juge: { couleur: '#112233', modele: 'opus' },
  agents: {
    drafion: { nom: 'Drafion', base: 'lecture', modele: 'haiku' },
    johms: { nom: 'Johms', base: 'expert', modele: 'opus', couleur: '#445566' },
    lucas: { nom: 'Lucas', base: 'lucas', role: 'Mails et maintenance' },
    julius: { nom: 'Julius Malanus', base: 'julius-malanus', modele: 'Sonnet' },
    herite: { nom: 'Hérité', base: 'perso', modele: 'inherit' }
  },
  relais: { minutes: 90, jetons: 400000, intervalleMinutes: 30 },
  theme: { accent: '#a78bfa' },
  sons: { actif: false },
  textes: { phrasesTravail: ['Au boulot'], rappel: 'Pense au relais' }
};

test('agents/kinan.md : le juge tourne sur Sonnet (frontmatter model)', () => {
  const md = fs.readFileSync(path.join(RACINE, 'agents', 'kinan.md'), 'utf8');
  assert.match(md, /^---[\s\S]*?^model: sonnet$/m);
  assert.strictEqual(require('../hooks/lib/config').modeleJuge(), 'sonnet');
});

test('aucun agent du plugin sans champ model ; seul expert est sur Opus', () => {
  for (const f of fs.readdirSync(path.join(RACINE, 'agents'))) {
    const m = /^model:\s*(\S+)/m.exec(fs.readFileSync(path.join(RACINE, 'agents', f), 'utf8'));
    assert.ok(m, f + ' : champ model absent (hériterait du chat principal)');
    if (m[1] === 'opus') assert.strictEqual(f, 'expert.md');
    assert.notStrictEqual(m[1], 'inherit', f);
  }
});

test('ancienne config : défauts hérités -> Sonnet, choix explicites conservés, autres préférences intactes', (t) => {
  const d = dossierTemp(t);
  ecrire(d, 'kinan.config.json', ANCIENNE);
  const avant = fs.readFileSync(path.join(d, 'kinan.config.json'), 'utf8');
  const c = charger(d);
  const m = Object.fromEntries(c.agents.map((a) => [a.id, a.modele]));
  assert.strictEqual(c.juge.modele, 'sonnet');                 // juge.modele « opus » hérité : ignoré, juge verrouillé sur Sonnet
  assert.strictEqual(m.lucas, 'sonnet');                       // clé absente, base personnalisée : Sonnet (avant : inherit)
  assert.strictEqual(m.johms, 'opus');                         // choix explicite conservé
  assert.strictEqual(m.drafion, 'haiku');
  assert.strictEqual(m.julius, 'sonnet');                      // « Sonnet » : casse ignorée (avant : rejeté, repli de base)
  assert.strictEqual(m.herite, 'inherit');                     // « inherit » écrit par l'utilisateur : conservé
  assert.deepStrictEqual(c.relais, { minutes: 90, jetons: 400000, intervalleMinutes: 30 });
  assert.strictEqual(c.juge.couleur, '#112233');
  assert.strictEqual(c.agents.find((a) => a.id === 'johms').couleur, '#445566');
  assert.strictEqual(c.theme.accent, '#a78bfa');
  assert.strictEqual(c.sons.actif, false);
  assert.deepStrictEqual(c.textes.phrasesTravail, ['Au boulot']);
  assert.strictEqual(c.agents.find((a) => a.id === 'lucas').role, 'Mails et maintenance');
  assert.strictEqual(fs.readFileSync(path.join(d, 'kinan.config.json'), 'utf8'), avant); // fichier jamais réécrit
  assert.deepStrictEqual(charger(d), c);                                                 // idempotent
});

test('modèle inconnu : alerte et modèle de la base, jamais Opus hors base expert', (t) => {
  const d = dossierTemp(t);
  ecrire(d, 'kinan.config.json', { agents: { a: { base: 'perso', modele: 'gpt' }, b: { base: 'production', modele: 'opus-max' } } });
  const c = charger(d);
  assert.deepStrictEqual(c.agents.map((a) => a.modele), ['sonnet', 'sonnet']);
  assert.ok(c.alertes.some((x) => /a : modèle inconnu/.test(x)));
});

test('fichier absent, illisible ou clés manquantes : défauts, juge et production sur Sonnet', (t) => {
  for (const contenu of [null, '{ cassé', '{}', '{"agents":{"x":{}}}', '{"agents":null,"relais":null,"textes":null,"juge":null}']) {
    const d = dossierTemp(t);
    if (contenu !== null) fs.writeFileSync(path.join(d, 'kinan.config.json'), contenu);
    const c = charger(d);
    assert.strictEqual(c.juge.modele, 'sonnet', String(contenu));
    for (const a of c.agents) if (a.base !== 'expert') assert.notStrictEqual(a.modele, 'opus', `${contenu} ${a.id}`);
    if (contenu === '{"agents":{"x":{}}}') assert.strictEqual(c.agents[0].modele, 'sonnet');
  }
});

test('SessionStart : le modèle transmis au juge et à chaque agent est celui de la config (Sonnet par défaut)', (t) => {
  const d = dossierTemp(t);
  ecrire(d, 'kinan.config.json', ANCIENNE);
  const r = lancer(HOOK('session.js'), { source: 'startup' }, d);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /juge : Kinan, model sonnet\)/);
  assert.match(r.stdout, /- lucas .*model sonnet,/);
  assert.match(r.stdout, /- johms .*model opus,/);
  assert.doesNotMatch(r.stdout, /- lucas .*model inherit/);
});
