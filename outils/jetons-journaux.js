// Totaux de jetons, d'appels et de durée lus dans des journaux de conversation Claude Code (.jsonl). Aucun réseau, aucun jeton.
// Usage : node outils/jetons-journaux.js <fichier.jsonl | dossier> [...] [--tarifs tarifs.json]
// Un dossier est parcouru en profondeur (les journaux de sous-agents, dans un dossier « subagents », sont comptés à part).
// Un message (même message.id) occupe plusieurs lignes : on garde la ligne à la plus grande sortie. Les messages « <synthetic> » sont ignorés.
// Coût : seulement avec --tarifs, fichier JSON de tarifs par million de jetons que vous remplissez vous-même, à la date de la mesure :
//   { "haiku": { "entree": 0, "sortie": 0, "cacheLecture": 0, "cacheEcriture": 0 }, "sonnet": {...}, "opus": {...} }
// Aucun tarif n'est intégré à ce script : sans --tarifs, aucun coût n'est affiché. Le format des journaux est celui de Claude Code, non garanti.
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let tarifs = null;
const i = args.indexOf('--tarifs');
if (i >= 0) { tarifs = JSON.parse(fs.readFileSync(args[i + 1], 'utf8')); args.splice(i, 2); }
if (!args.length) { console.error('Usage : node outils/jetons-journaux.js <fichier.jsonl | dossier> [...] [--tarifs tarifs.json]'); process.exit(2); }

function lister(p, acc = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const n of fs.readdirSync(p)) lister(path.join(p, n), acc);
  else if (p.endsWith('.jsonl')) acc.push(p);
  return acc;
}
const famille = (m) => (/haiku/i.test(m) ? 'haiku' : /sonnet/i.test(m) ? 'sonnet' : /opus/i.test(m) ? 'opus' : 'autre');

const msgs = new Map(); // clé message -> enregistrement
let t0 = Infinity, t1 = -Infinity, n = 0;
for (const arg of args) for (const f of lister(arg)) {
  const sous = /[\\/]subagents[\\/]/.test(f);
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (l.indexOf('"usage"') < 0) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const m = o.message, u = m && m.usage;
    if (!u || m.role !== 'assistant' || m.model === '<synthetic>') continue;
    const t = Date.parse(o.timestamp); if (t) { t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
    const rec = { f: famille(String(m.model || '')), sous: sous || !!o.isSidechain, i: u.input_tokens | 0, o: u.output_tokens | 0, r: u.cache_read_input_tokens | 0, c: u.cache_creation_input_tokens | 0 };
    const cle = m.id ? 'id|' + m.id : 'ligne|' + (n++);
    const deja = msgs.get(cle);
    if (!deja || rec.o >= deja.o) msgs.set(cle, rec);
  }
}
const tot = {};
for (const r of msgs.values()) {
  const k = r.f + (r.sous ? ' (sous-agents)' : ' (conversation)');
  const x = tot[k] || (tot[k] = { f: r.f, appels: 0, i: 0, o: 0, r: 0, c: 0 });
  x.appels++; x.i += r.i; x.o += r.o; x.r += r.r; x.c += r.c;
}
let usd = 0;
console.log('groupe'.padEnd(26), 'appels'.padStart(7), 'entrée'.padStart(10), 'sortie'.padStart(10), 'cache lu'.padStart(11), 'cache créé'.padStart(11));
for (const k of Object.keys(tot).sort()) {
  const x = tot[k];
  console.log(k.padEnd(26), String(x.appels).padStart(7), String(x.i).padStart(10), String(x.o).padStart(10), String(x.r).padStart(11), String(x.c).padStart(11));
  const p = tarifs && tarifs[x.f];
  if (p) usd += (x.i * p.entree + x.o * p.sortie + x.r * p.cacheLecture + x.c * p.cacheEcriture) / 1e6;
}
console.log(`appels au total : ${msgs.size}`);
if (Number.isFinite(t0)) console.log(`durée entre le premier et le dernier message : ${((t1 - t0) / 1000).toFixed(0)} s`);
console.log(tarifs ? `coût (unité de vos tarifs) : ${usd.toFixed(4)}` : 'coût : non calculé (aucun --tarifs)');
