// Fichiers d'état partagés par les hooks (et par le tableau de bord) : lecture tolérante, écriture atomique, verrou.
// Aucune fonction ne lève d'exception sauf ecrireAtomique (l'appelant décide). Aucun accès réseau.
const fs = require('fs');
const path = require('path');

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Objet JSON lu dans f. Tout autre contenu (absent, illisible, tronqué, null, tableau, nombre, texte) donne defaut().
function lireObjet(f, defaut = () => ({})) {
  try {
    const o = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
    if (o && typeof o === 'object' && !Array.isArray(o)) return o;
  } catch { /* contenu invalide : valeur par défaut */ }
  return defaut();
}

// Écriture atomique : fichier temporaire puis renommage, 3 essais espacés de 50 ms (EPERM/EBUSY/EACCES sous Windows).
function ecrireAtomique(f, contenu) {
  const tmp = f + '.' + process.pid + '.' + Date.now() + '.' + Math.random().toString(36).slice(2, 8) + '.tmp';
  try {
    fs.writeFileSync(tmp, contenu);
    for (let i = 0; ; i++) {
      try { fs.renameSync(tmp, f); return; } catch (e) {
        if (i >= 2 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
        pause(50);
      }
    }
  } catch (e) { try { fs.unlinkSync(tmp); } catch { /* déjà absent */ } throw e; }
}

// Verrou par fichier : création exclusive, attente courte (essais x 25 ms), verrou périmé (plus de 3 s) repris.
// Même protocole que le tableau de bord (gestion-ipc.js) pour state.lock. Rend { fd, jeton, fichier } ou null (verrou non obtenu).
function prendreVerrou(fichier, essais = 60) {
  try { fs.mkdirSync(path.dirname(fichier), { recursive: true }); } catch { return null; }
  for (let i = 0; i < essais; i++) {
    let fd;
    try { fd = fs.openSync(fichier, 'wx'); } catch {
      try { // verrou périmé : retiré seulement s'il n'a pas changé entre la lecture et le retrait
        const st = fs.statSync(fichier);
        if (Date.now() - st.mtimeMs > 3000) {
          const avant = fs.readFileSync(fichier, 'utf8');
          if (fs.statSync(fichier).mtimeMs === st.mtimeMs && fs.readFileSync(fichier, 'utf8') === avant) fs.unlinkSync(fichier);
        }
      } catch { /* repris par un autre */ }
      pause(25);
      continue;
    }
    const jeton = process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    try { fs.writeSync(fd, jeton); return { fd, jeton, fichier }; } catch { // verrou sans propriétaire : retiré, nouvel essai
      try { fs.closeSync(fd); } catch { /* ignoré */ }
      try { fs.unlinkSync(fichier); } catch { /* ignoré */ }
      pause(25);
    }
  }
  return null;
}

// Libère seulement son propre verrou (jeton identique).
function libererVerrou(v) {
  if (!v) return;
  try { fs.closeSync(v.fd); } catch { /* ignoré */ }
  try { if (fs.readFileSync(v.fichier, 'utf8') === v.jeton) fs.unlinkSync(v.fichier); } catch { /* ignoré */ }
}

module.exports = { lireObjet, ecrireAtomique, prendreVerrou, libererVerrou };
