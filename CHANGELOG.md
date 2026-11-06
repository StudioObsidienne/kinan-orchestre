# Journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; versions : [SemVer](https://semver.org/lang/fr/).

## [Non publié]
### Ajouté
- Tests automatisés `tests/` (`node --test tests/`, sans dépendance) : hooks, scripts, manifestes, permissions des agents, entrées illisibles, fichiers corrompus, agent muet, tâche bloquée, verrous, hooks simultanés.
- Hook `hooks/verrou-fichiers.js` (PreToolUse Edit/Write/MultiEdit/NotebookEdit, SubagentStop, Stop) : un fichier modifié par un agent lui est réservé ; un autre agent ou une autre conversation est refusé jusqu'à la fin de cet agent ou 10 min sans modification.
- `hooks/lib/fichiers.js` : lecture tolérante, écriture atomique et verrou communs aux hooks.
- README : section « Permissions des agents » ; juge : jamais deux agents en parallèle sur les mêmes fichiers.
### Corrigé
- Un `state.json`, `taches.json`, `sessions.json`, `agents-ids.json` ou `rappels.json` corrompu (par exemple `null`) bloquait tous les événements suivants : il est réparé au premier événement.
- Agent muet : un agent « au travail » sans nouvelle depuis 1 h repasse au repos au prochain événement.
- Tâche bloquée : une mission « en cours » depuis plus de 4 h repasse « à faire » (champ `interrompue`) et ne capte plus l'identifiant ni la fin d'un nouvel agent ; une tâche saisie dans le tableau de bord n'est plus liée à un agent.
- `rappels.json` écrit de façon atomique sous verrou ; `session.js` annonce l'équipe même si l'événement reçu est illisible.


## [0.2.1] - 2026-11-06
### Ajouté
- Agents `courrier` et `devis` dans la configuration par défaut (affichés par le tableau de bord seulement quand l'option Courrier est activée).

## [0.2.0] - 2026-11-06
### Ajouté
- Section `theme` de `kinan.config.json` (couleurs `#rgb`/`#rrggbb`, polices, logo, source), validée dans `hooks/lib/config.js` et affichée par `outils/verifier-config.js` ; appliquée par le tableau de bord, livré à part.
- Compétence `/kinan-orchestre:demarrage` : didacticiel de premier lancement.
- `examples/` (modèles d'agents courrier et devis, grille de prix fictive, script de calcul d'exemple) et `docs/ETENDRE.md`.
- `assets/` : logo et bannières SVG ; en-tête des README refait.
- Agents `courrier` (Haiku) et `devis` (Sonnet), lancés par l'onglet Courrier du tableau de bord : lecture seule (Read, Glob, Grep), chemins reçus dans le message de l'appli, réponse en bloc JSON validé par l'appli. Récap des mails en lignes séparées ; liste `non_lus` pour qu'un mail non lu ne passe jamais à « traité » ; le devis choisit des lignes et des quantités de la grille, les montants sont calculés par l'appli.
- README : section « Courrier et devis » (connexion de la boîte par fournisseur : Zoho, Gmail, Outlook/Microsoft 365, OVHcloud, iCloud, autre) ; ligne `mentions` facultative dans la grille d'exemple.
### Modifié
- README, section Tableau de bord : la phrase sur une future édition sans modules réseau est remplacée par la description des deux options réseau désactivées par défaut (mises à jour, courrier).

## [0.1.0] - 2026-11-06
### Ajouté
- Licence Apache-2.0 (`LICENSE`, `NOTICE`), auteur Studio Obsidienne, icône, README en anglais et en français.
- Squelette du plugin : manifeste, marketplace local, quatre agents (juge Kinan, lecture, production, expert).
- Hooks : composition de l'équipe et point de reprise (SessionStart), état des agents, rappel de relais.
- `kinan.config.json` : agents, seuils de relais, sons, textes ; juge et règles de sécurité verrouillés.
- Compétences `/kinan-orchestre:relais` et `/kinan-orchestre:projet`.
