// Modèle de script de calcul de devis. À copier et adapter ; il ne fait aucun accès réseau et n'envoie rien.
// Usage : node calculer-devis.exemple.js grille-prix.exemple.json lignes.json
// lignes.json : [ { "id": "exemple-a", "quantite": 2 }, { "id": "exemple-heure", "quantite": 3.5 } ]
// Le calcul se fait en centimes entiers pour éviter les erreurs d'arrondi des nombres décimaux.
const fs = require('fs');
const [, , fGrille, fLignes] = process.argv;
if (!fGrille || !fLignes) { console.error('Usage : node calculer-devis.exemple.js <grille.json> <lignes.json>'); process.exit(2); }
const lire = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const grille = lire(fGrille), demandees = lire(fLignes);
const parId = new Map((grille.lignes || []).map((l) => [l.id, l]));
const lignes = [];
let totalHt = 0;
for (const d of demandees) {
  const l = parId.get(d.id);
  if (!l) { console.error('Ligne inconnue dans la grille : ' + d.id); process.exit(1); }
  if (!(typeof d.quantite === 'number' && d.quantite > 0)) { console.error('Quantité invalide pour : ' + d.id); process.exit(1); }
  const centimes = Math.round(d.quantite * Math.round(l.prixUnitaire * 100));
  totalHt += centimes;
  lignes.push({ id: l.id, libelle: l.libelle, quantite: d.quantite, unite: l.unite, totalHt: centimes / 100 });
}
const tva = Math.round(totalHt * (grille.tauxTva || 0));
console.log(JSON.stringify({ devise: grille.devise, lignes, totalHt: totalHt / 100, tva: tva / 100, totalTtc: (totalHt + tva) / 100 }, null, 2));
