// Mesure le temps de chaque hook (processus node complet, démarrage compris) avec des événements simulés.
// Usage : node bench/mesurer-hooks.js [N]   (N = répétitions, 30 par défaut). Aucun jeton, aucun réseau.
// Dossier d'état temporaire (KINAN_OS_DOSSIER) : ~/.kinan-os n'est ni lu ni modifié ; supprimé à la fin.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const N = Math.max(5, parseInt(process.argv[2], 10) || 30);
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'kinan-mesure-'));
const env = { ...process.env, KINAN_OS_DOSSIER: dossier };
const base = { session_id: 'mesure-1', cwd: dossier, hook_event_name: 'UserPromptSubmit' };
const CAS = [
  ['node -e 0 (référence)', null, null],
  ['session.js (SessionStart)', 'hooks/session.js', { ...base, hook_event_name: 'SessionStart', source: 'startup' }],
  ['etat.js (UserPromptSubmit)', 'hooks/etat.js', base],
  ['etat.js (PreToolUse Agent)', 'hooks/etat.js', { ...base, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { subagent_type: 'kinan-orchestre:production', description: 'skyze : mesure' } }],
  ['verrou-fichiers.js (PreToolUse Edit)', 'hooks/verrou-fichiers.js', { ...base, hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: path.join(dossier, 'a.txt') } }],
  ['rappel-relais.js (sans journal)', 'hooks/rappel-relais.js', base]
];
const mediane = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`node ${process.version} ${os.platform()} N=${N}`);
try {
  for (const [nom, f, e] of CAS) {
    const t = [];
    for (let i = 0; i < N; i++) {
      const d0 = process.hrtime.bigint();
      if (f) spawnSync(process.execPath, [path.join(RACINE, f)], { input: JSON.stringify(e), env });
      else spawnSync(process.execPath, ['-e', '0'], { env });
      t.push(Number(process.hrtime.bigint() - d0) / 1e6);
    }
    console.log(`${nom.padEnd(40)} médiane ${mediane(t).toFixed(0)} ms ; min ${Math.min(...t).toFixed(0)} ms ; max ${Math.max(...t).toFixed(0)} ms`);
  }
} finally { fs.rmSync(dossier, { recursive: true, force: true }); }
