// Hook de concurrence : un fichier du projet modifié par un agent lui est réservé tant qu'il travaille.
// PreToolUse (Edit, Write, MultiEdit, NotebookEdit) : réserve le fichier, ou refuse l'outil si un autre agent actif l'a réservé.
// SubagentStop : libère les fichiers de cet agent. Stop : libère ceux de la conversation principale.
// Une réservation sans nouvelle modification expire après 10 min (agent muet, fin non signalée).
// Propriétaire : agent_id quand Claude Code le fournit (outil appelé par un sous-agent), sinon la conversation (session_id).
// Limites : sans agent_id, deux sous-agents d'une même conversation ne sont pas distingués (aucun refus entre eux) ;
// une modification faite par Bash (sed, redirection…) n'est pas vue. Toute erreur : aucun refus. Aucun accès réseau.
const path = require('path');
const { charger } = require('./lib/config');
const { lireObjet, ecrireAtomique, prendreVerrou, libererVerrou } = require('./lib/fichiers');

const DUREE = 10 * 60 * 1000;
const MAX = 500;
const OUTILS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
const propre = (t, n) => String(t == null ? '' : t).replace(/[\r\n\t]+/g, ' ').replace(/[<>`]/g, '').trim().slice(0, n);

// Clé d'un fichier : chemin absolu ; sans distinction de casse sous Windows et macOS (systèmes de fichiers insensibles par défaut).
function cleFichier(f, cwd) {
  const p = path.resolve(String(cwd || process.cwd()), String(f));
  return process.platform === 'win32' || process.platform === 'darwin' ? p.toLowerCase() : p;
}

function traiter(e, dossier, maintenant = Date.now()) {
  const ev = e.hook_event_name;
  if (ev === 'PreToolUse' && !OUTILS.includes(e.tool_name)) return null;
  if (!['PreToolUse', 'SubagentStop', 'Stop'].includes(ev)) return null;
  const F = path.join(dossier, 'fichiers-verrous.json');
  const verrou = prendreVerrou(path.join(dossier, 'fichiers.lock'), 40); // ~1 s au plus
  if (!verrou) return null; // verrou non obtenu : on laisse passer plutôt que de bloquer
  try {
    const d = lireObjet(F);
    for (const k of Object.keys(d)) { const x = d[k]; if (!x || typeof x !== 'object' || typeof x.proprio !== 'string' || !(maintenant - (Number(x.maj) || 0) < DUREE)) delete d[k]; }
    let refus = null;
    if (ev === 'PreToolUse') {
      const ti = e.tool_input && typeof e.tool_input === 'object' ? e.tool_input : {};
      const brut = ti.file_path || ti.notebook_path;
      if (!brut || typeof brut !== 'string') return null;
      const proprio = e.agent_id ? 'agent:' + e.agent_id : 'session:' + String(e.session_id || 'inconnue');
      const k = cleFichier(brut, e.cwd);
      const x = d[k];
      if (x && x.proprio !== proprio) {
        const min = Math.max(1, Math.round((DUREE - (maintenant - x.maj)) / 60000));
        const qui = x.proprio.startsWith('agent:') ? `l'agent ${propre(x.agent, 40) || 'inconnu'}` : (x.session === e.session_id ? 'la conversation principale' : 'une autre conversation');
        refus = `Fichier réservé : ${propre(brut, 300)} est en cours de modification par ${qui}. Ne le modifie pas maintenant : `
          + `termine le reste de ta mission et signale ce conflit dans ton rapport (le juge décidera de l'ordre). `
          + `Réservation libérée à la fin de cet agent, ou dans ${min} min au plus sans nouvelle modification.`;
      } else {
        d[k] = { proprio, agent: propre(e.agent_type || (e.agent_id ? 'agent' : 'conversation'), 60), session: String(e.session_id || ''), maj: maintenant };
        const cles = Object.keys(d);
        if (cles.length > MAX) for (const c of cles.sort((a, b) => d[a].maj - d[b].maj).slice(0, cles.length - MAX)) delete d[c];
      }
    } else {
      const proprio = ev === 'SubagentStop' ? (e.agent_id ? 'agent:' + e.agent_id : null) : (e.session_id ? 'session:' + e.session_id : null);
      if (proprio) for (const k of Object.keys(d)) if (d[k].proprio === proprio) delete d[k];
    }
    ecrireAtomique(F, JSON.stringify(d));
    return refus;
  } catch { return null; } finally { libererVerrou(verrou); }
}

if (require.main === module) {
  let brut = '';
  process.stdin.on('data', (x) => (brut += x));
  process.stdin.on('end', () => {
    try {
      const e = JSON.parse(brut || '{}');
      if (!e || typeof e !== 'object' || Array.isArray(e)) return;
      const refus = traiter(e, charger().dossier);
      if (refus) {
        // KINAN_VERROU=avertir : l'écriture reste permise, l'agent reçoit seulement l'avertissement.
        const sortie = process.env.KINAN_VERROU === 'avertir'
          ? { hookEventName: 'PreToolUse', additionalContext: 'Avertissement : ' + refus }
          : { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: refus };
        process.stdout.write(JSON.stringify({ hookSpecificOutput: sortie }) + '\n');
      }
    } catch { /* un hook ne doit jamais gêner Claude */ }
  });
}

module.exports = { traiter, cleFichier, DUREE };
