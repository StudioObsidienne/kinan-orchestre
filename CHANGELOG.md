# Journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions : [SemVer](https://semver.org/lang/fr/).

## [Non publié]
### Ajouté
- Section `theme` de `kinan.config.json` (couleurs `#rgb`/`#rrggbb`, polices, logo, source), validée dans `hooks/lib/config.js` et affichée par `outils/verifier-config.js` ; appliquée par le tableau de bord, livré à part.
- Compétence `/kinan-orchestre:demarrage` : didacticiel de premier lancement.
- `examples/` (modèles d'agents courrier et devis, grille de prix fictive, script de calcul d'exemple) et `docs/ETENDRE.md`.
- `assets/` : logo et bannières SVG ; en-tête des README refait.

## [0.1.0] - 2026-11-06
### Ajouté
- Licence Apache-2.0 (`LICENSE`, `NOTICE`), auteur Studio Obsidienne, icône, README en anglais et en français.
- Squelette du plugin : manifeste, marketplace local, quatre agents (juge Kinan, lecture, production, expert).
- Hooks : composition de l'équipe et point de reprise (SessionStart), état des agents, rappel de relais.
- `kinan.config.json` : agents, seuils de relais, sons, textes ; juge et règles de sécurité verrouillés.
- Compétences `/kinan-orchestre:relais` et `/kinan-orchestre:projet`.
