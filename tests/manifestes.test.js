// Manifestes, scripts et permissions des agents : ce que le README annonce est vérifié ici.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { RACINE } = require('./aide');

const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(RACINE, f), 'utf8'));
const scripts = () => ['hooks', 'hooks/lib', 'outils'].flatMap((dir) => fs.readdirSync(path.join(RACINE, dir)).filter((f) => f.endsWith('.js')).map((f) => path.join(RACINE, dir, f)));

test('manifestes JSON lisibles, version identique dans plugin.json et marketplace.json', () => {
  const plugin = lireJson('.claude-plugin/plugin.json');
  const place = lireJson('.claude-plugin/marketplace.json');
  lireJson('config/kinan.config.defaut.json');
  const entree = (place.plugins || []).find((p) => p.name === plugin.name);
  assert.ok(entree, 'plugin listé dans marketplace.json');
  if (entree.version) assert.strictEqual(entree.version, plugin.version);
});

test('hooks.json : chaque commande vise un script existant, avec un délai maximum', () => {
  const h = lireJson('hooks/hooks.json').hooks;
  let n = 0;
  for (const [evenement, groupes] of Object.entries(h)) for (const g of groupes) for (const c of g.hooks) {
    n++;
    const m = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)"/.exec(c.command);
    assert.ok(m, `${evenement} : ${c.command}`);
    assert.ok(fs.existsSync(path.join(RACINE, m[1])), m[1]);
    assert.ok(Number.isInteger(c.timeout) && c.timeout <= 30, `${evenement} : timeout`);
  }
  assert.ok(n > 0);
});

test('node --check passe sur chaque script de hooks/ et outils/', () => {
  for (const f of scripts()) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, f + ' ' + r.stderr);
  }
});

test('hooks : aucun module réseau, aucune dépendance externe', () => {
  for (const f of scripts()) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/require\(['"]([^'"]+)['"]\)/g)) assert.ok(['fs', 'os', 'path', 'crypto', 'child_process'].includes(m[1]) || m[1].startsWith('.'), `${path.basename(f)} : ${m[1]}`);
    assert.ok(!/require\(['"]child_process['"]\)/.test(src), `${path.basename(f)} : aucun processus lancé`);
    assert.ok(!/\bfetch\(|https?\.request|net\.connect/.test(src), path.basename(f));
  }
});

// Permissions : tableau tenu à jour dans le README (section « Agent permissions »). Absence de « tools » = tous les outils de la session.
const PERMISSIONS = {
  kinan: null,
  production: null,
  expert: null,
  lecture: ['Read', 'Grep', 'Glob', 'Bash', 'WebFetch', 'WebSearch'],
  courrier: ['Read', 'Grep', 'Glob'],
  devis: ['Read', 'Grep', 'Glob']
};

function entete(f) {
  const s = fs.readFileSync(f, 'utf8').replace(/\r/g, '');
  const m = /^---\n([\s\S]*?)\n---/.exec(s);
  assert.ok(m, f);
  return Object.fromEntries(m[1].split('\n').map((l) => /^([a-zA-Z]+):\s*(.*)$/.exec(l)).filter(Boolean).map((x) => [x[1], x[2].trim()]));
}

test('permissions des agents conformes au tableau documenté ; courrier et devis en lecture seule', () => {
  const dir = path.join(RACINE, 'agents');
  const fichiers = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.deepStrictEqual(fichiers.map((f) => f.replace(/\.md$/, '')).sort(), Object.keys(PERMISSIONS).sort(), 'nouvel agent : compléter le tableau des permissions');
  for (const f of fichiers) {
    const e = entete(path.join(dir, f));
    const attendu = PERMISSIONS[f.replace(/\.md$/, '')];
    const outils = e.tools ? e.tools.split(',').map((x) => x.trim()).filter(Boolean) : null;
    assert.deepStrictEqual(outils, attendu, f);
    if (outils) for (const interdit of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Agent']) assert.ok(!outils.includes(interdit), `${f} : ${interdit}`);
  }
  const readme = fs.readFileSync(path.join(RACINE, 'README.md'), 'utf8');
  assert.match(readme, /## Agent permissions/);
});
