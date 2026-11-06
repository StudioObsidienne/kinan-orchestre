// Vérifie kinan.config.json et affiche la configuration effective (après valeurs par défaut).
// Usage : node outils/verifier-config.js   (dossier : ~/.kinan-os, ou KINAN_OS_DOSSIER)
const { charger } = require('../hooks/lib/config');
const cfg = charger();
console.log('Fichier : ' + cfg.fichier);
console.log('Juge : ' + cfg.juge.nom + ' (verrouillé)');
for (const a of cfg.agents) console.log(`- ${a.id} « ${a.nom} » : ${a.type}, ${a.modele}, effort ${a.effort}/${a.effortHaut}`);
console.log(`Relais : ${cfg.relais.minutes} min ou ${cfg.relais.jetons} jetons, rappel toutes les ${cfg.relais.intervalleMinutes} min au plus`);
const reglages = Object.entries(cfg.theme).filter(([, v]) => v);
console.log('Thème : ' + (reglages.length ? reglages.map(([k, v]) => `${k} ${v}`).join(', ') : 'aucun réglage : le tableau de bord garde ses couleurs') + (reglages.length ? ' (appliqué par le tableau de bord)' : ''));
if (cfg.alertes.length) { console.log('Alertes :'); for (const x of cfg.alertes) console.log('  ' + x); process.exitCode = 1; }
else console.log('Configuration valide.');
