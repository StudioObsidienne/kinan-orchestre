---
name: projet
description: Crée la fiche PROJET.md du projet à partir du modèle (40 lignes) pour que les agents lisent la fiche au lieu de réexplorer le projet.
disable-model-invocation: true
---

1. Si `PROJET.md` existe déjà à la racine du projet, ne l'écrase pas : propose seulement les rubriques manquantes.
2. Sinon, copie `PROJET-modele.md` (dans le dossier de cette compétence) vers `PROJET.md` à la racine du projet.
3. Remplis uniquement ce qui est déjà connu et vérifiable (README, package.json, CLAUDE.md, arborescence de premier niveau) ; laisse « à compléter » ailleurs. N'invente rien.
4. Réponds en une ligne : chemin de la fiche et rubriques restant à compléter.
