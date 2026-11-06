// Hook UserPromptSubmit : rappel « refaire conversation » quand la conversation devient trop longue (0 jeton sous le seuil).
// Seuils (kinan.config.json, section relais) : durée depuis le premier message OU taille du contexte. Un rappel au plus
// toutes les « intervalleMinutes » par conversation. Lit le journal local de la conversation (transcript_path) ; aucun réseau.
// Limite : le format du journal n'est pas une interface documentée ; s'il change, le hook se tait au lieu d'échouer.
const fs = require('fs');
const path = require('path');
const { charger } = require('./lib/config');

function lireTete(f, n = 64 * 1024) {
  const fd = fs.openSync(f, 'r');
  try { const b = Buffer.alloc(n); const lu = fs.readSync(fd, b, 0, n, 0); return b.slice(0, lu).toString('utf8'); } finally { fs.closeSync(fd); }
}
function lireQueue(f, n = 512 * 1024) {
  const taille = fs.statSync(f).size, debut = Math.max(0, taille - n);
  const fd = fs.openSync(f, 'r');
  try { const b = Buffer.alloc(taille - debut); fs.readSync(fd, b, 0, b.length, debut); return b.toString('utf8'); } finally { fs.closeSync(fd); }
}

let brut = '';
process.stdin.on('data', (d) => (brut += d));
process.stdin.on('end', () => {
  try {
    const e = JSON.parse(brut || '{}');
    const f = e.transcript_path;
    if (!f || !fs.existsSync(f)) return;
    const cfg = charger();
    const { minutes: SEUIL_MIN, jetons: SEUIL_CTX, intervalleMinutes: INTERVALLE_MIN } = cfg.relais;
    // Début de la conversation : premier horodatage du journal.
    let debut = null;
    for (const l of lireTete(f).split('\n')) { if (!l) continue; try { const o = JSON.parse(l); if (o.timestamp) { debut = Date.parse(o.timestamp); break; } } catch {} }
    // Taille du contexte : dernier message assistant (hors messages synthétiques).
    let ctx = 0;
    const lignes = lireQueue(f).split('\n');
    for (let i = lignes.length - 1; i >= 0; i--) {
      if (!lignes[i] || lignes[i].indexOf('"usage"') < 0) continue;
      try { const o = JSON.parse(lignes[i]); const u = o.message && o.message.usage; if (o.type === 'assistant' && u && o.message.model !== '<synthetic>') { ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0); break; } } catch {}
    }
    const minutes = debut ? Math.round((Date.now() - debut) / 60000) : 0;
    if (minutes < SEUIL_MIN && ctx < SEUIL_CTX) return;
    // Anti-répétition par conversation (fichier rappels.json du dossier d'état, entrées de plus de 7 jours purgées).
    const F = path.join(cfg.dossier, 'rappels.json');
    let r = {}; try { r = JSON.parse(fs.readFileSync(F, 'utf8')); } catch {}
    const id = String(e.session_id || f);
    if (Date.now() - (r[id] || 0) < INTERVALLE_MIN * 60000) return;
    r[id] = Date.now();
    for (const k of Object.keys(r)) if (Date.now() - r[k] > 7 * 86400000) delete r[k];
    fs.mkdirSync(cfg.dossier, { recursive: true });
    fs.writeFileSync(F, JSON.stringify(r));
    const h = Math.floor(minutes / 60), m = String(minutes % 60).padStart(2, '0'), k = Math.round(ctx / 1000);
    const modele = cfg.textes.rappel ||
      'RAPPEL OBLIGATOIRE (économie de jetons) : cette conversation est ouverte depuis {h} h {m} et son contexte est d\'environ {k} k jetons. Commence ta réponse par cette ligne exacte : « REFAIRE CONVERSATION : tape /kinan-orchestre:relais, puis ouvre une nouvelle conversation et écris : reprends. » Réponds ensuite normalement, sans commentaire sur ce rappel.';
    process.stdout.write(modele.replace(/\{h\}/g, h).replace(/\{m\}/g, m).replace(/\{k\}/g, k) + '\n');
  } catch { /* silencieux */ }
});
