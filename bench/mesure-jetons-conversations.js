// Mesure observationnelle : jetons par modèle dans les journaux d'un projet. Usage : node bench/mesure-jetons-conversations.js [dossier des journaux .jsonl]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || require('path').join(require('os').homedir(), '.claude', 'projects');
const fam = (m) => (/haiku/i.test(m) ? 'haiku' : /sonnet/i.test(m) ? 'sonnet' : /opus/i.test(m) ? 'opus' : 'autre');
function lister(p, acc = []) {
  for (const n of fs.readdirSync(p)) {
    const q = path.join(p, n);
    if (fs.statSync(q).isDirectory()) lister(q, acc);
    else if (q.endsWith('.jsonl') && fs.statSync(q).size > 0) acc.push(q);
  }
  return acc;
}
const files = lister(ROOT);
const msgs = new Map();
let n = 0;
const convs = new Map(); // id -> {t0,t1,lignes}
for (const f of files) {
  const mu = f.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i); const rel = mu ? mu[1] : f;
  const parts = rel.split(/[\/]/);
  const conv = parts[0].replace(/\.jsonl$/, '');
  const sous = /subagents/.test(f);
  const c = convs.get(conv) || convs.set(conv, { t0: Infinity, t1: -Infinity, fichiers: 0 }).get(conv);
  c.fichiers++;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (l.indexOf('"usage"') < 0) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const m = o.message, u = m && m.usage;
    if (!u || m.role !== 'assistant' || m.model === '<synthetic>') continue;
    const t = Date.parse(o.timestamp); if (t) { c.t0 = Math.min(c.t0, t); c.t1 = Math.max(c.t1, t); }
    const rec = { conv, f: fam(String(m.model || '')), sous: sous || !!o.isSidechain, i: u.input_tokens | 0, o: u.output_tokens | 0, r: u.cache_read_input_tokens | 0, c: u.cache_creation_input_tokens | 0 };
    const cle = m.id ? 'id|' + m.id : 'ligne|' + (n++);
    const d = msgs.get(cle);
    if (!d || rec.o >= d.o) msgs.set(cle, rec);
  }
}
const acc = () => ({ appels: 0, i: 0, o: 0, r: 0, c: 0 });
const add = (x, r) => { x.appels++; x.i += r.i; x.o += r.o; x.r += r.r; x.c += r.c; };
const tot = {}; // key fam|type
const parConv = new Map();
const parType = { conv: acc(), sous: acc() };
const fams = ['opus', 'sonnet', 'haiku', 'autre'];
for (const r of msgs.values()) {
  const type = r.sous ? 'sous' : 'conv';
  const k = r.f + '|' + type;
  add(tot[k] || (tot[k] = acc()), r);
  add(parType[type], r);
  let pc = parConv.get(r.conv); if (!pc) { pc = {}; parConv.set(r.conv, pc); }
  add(pc[k] || (pc[k] = acc()), r);
}
const fmt = (x) => `appels=${x.appels} entree=${x.i} sortie=${x.o} cacheLu=${x.r} cacheCree=${x.c}`;
console.log('== TOTAL PAR MODELE ET TYPE ==');
for (const k of Object.keys(tot).sort()) console.log(k, fmt(tot[k]));
console.log('== TOTAL PAR TYPE ==');
for (const t of ['conv', 'sous']) console.log(t, fmt(parType[t]));
const sumO = Object.values(parType).reduce((a, x) => a + x.o, 0);
const sumA = Object.values(parType).reduce((a, x) => a + x.appels, 0);
console.log('== PARTS (tous messages) ==');
for (const f of fams) {
  const ao = Object.keys(tot).filter(k => k.startsWith(f + '|')).reduce((a, k) => a + tot[k].o, 0);
  const aa = Object.keys(tot).filter(k => k.startsWith(f + '|')).reduce((a, k) => a + tot[k].appels, 0);
  if (aa) console.log(f, `partSortie=${(100 * ao / sumO).toFixed(1)}% partAppels=${(100 * aa / sumA).toFixed(1)}%`);
}
console.log('== PARTS DES SOUS-AGENTS PAR MODELE (sur sous-agents) ==');
const sO = parType.sous.o, sA = parType.sous.appels;
for (const f of fams) {
  const k = f + '|sous';
  if (tot[k]) console.log(f, `partSortieSousAgents=${(100 * tot[k].o / sO).toFixed(1)}% partAppelsSousAgents=${(100 * tot[k].appels / sA).toFixed(1)}%`);
}
console.log('== PAR CONVERSATION ==');
let idx = 0;
const liste = [...convs.entries()].sort((a, b) => a[1].t0 - b[1].t0);
for (const [id, c] of liste) {
  idx++;
  const p = parConv.get(id) || {};
  const sous = Object.keys(p).filter(k => k.endsWith('|sous')).map(k => `${k.split('|')[0]}:${p[k].appels}a/${p[k].o}o`).join(' ');
  const conv = Object.keys(p).filter(k => k.endsWith('|conv')).map(k => `${k.split('|')[0]}:${p[k].appels}a/${p[k].o}o`).join(' ');
  const dur = Number.isFinite(c.t0) ? ((c.t1 - c.t0) / 60000).toFixed(0) + ' min' : 'n/a';
  const debut = Number.isFinite(c.t0) ? new Date(c.t0).toISOString().slice(0, 16) : 'n/a';
  const fin = Number.isFinite(c.t1) ? new Date(c.t1).toISOString().slice(0, 16) : 'n/a';
  const tt = Object.values(p).reduce((a, x) => ({ appels: a.appels + x.appels, o: a.o + x.o, i: a.i + x.i, r: a.r + x.r, c: a.c + x.c }), { appels: 0, o: 0, i: 0, r: 0, c: 0 });
  console.log(`C${idx} ${debut}->${fin} ${dur} fichiers=${c.fichiers} | ${fmt(tt)} | conv[${conv || '-'}] | sous[${sous || '-'}]`);
}
console.log('nb conversations:', convs.size, 'nb fichiers non vides:', files.length, 'nb messages:', msgs.size);
