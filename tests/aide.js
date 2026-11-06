// Outils communs aux tests (node --test tests/). Chaque test travaille dans un dossier d'état temporaire (KINAN_OS_DOSSIER) :
// rien n'est lu ni écrit dans ~/.kinan-os. Aucun réseau.
'use strict';
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const HOOK = (nom) => path.join(RACINE, 'hooks', nom);
const OUTIL = (nom) => path.join(RACINE, 'outils', nom);

function dossierTemp(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kinan-test-'));
  if (t) t.after(() => { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignoré */ } });
  return d;
}

function env(dossier) {
  const e = { ...process.env, KINAN_OS_DOSSIER: dossier };
  delete e.CLAUDE_PROJECT_DIR;
  return e;
}

const texte = (entree) => (typeof entree === 'string' ? entree : JSON.stringify(entree));

// Lance un hook comme Claude Code : événement JSON sur l'entrée standard.
function lancer(script, entree, dossier) {
  return spawnSync(process.execPath, [script], { input: texte(entree), env: env(dossier), encoding: 'utf8', timeout: 15000 });
}

function lancerAsync(script, entree, dossier) {
  return new Promise((ok) => {
    const p = spawn(process.execPath, [script], { env: env(dossier) });
    let stdout = '', stderr = '';
    p.stdout.on('data', (x) => (stdout += x));
    p.stderr.on('data', (x) => (stderr += x));
    p.on('close', (status) => ok({ status, stdout, stderr }));
    p.stdin.end(texte(entree));
  });
}

const lireJson = (dossier, nom) => JSON.parse(fs.readFileSync(path.join(dossier, nom), 'utf8'));
const ecrire = (dossier, nom, contenu) => fs.writeFileSync(path.join(dossier, nom), texte(contenu));
const existe = (dossier, nom) => fs.existsSync(path.join(dossier, nom));

module.exports = { RACINE, HOOK, OUTIL, dossierTemp, lancer, lancerAsync, lireJson, ecrire, existe };
