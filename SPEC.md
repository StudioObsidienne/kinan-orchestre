# SPEC : plugin « kinan-orchestre » (phase 1)

Promesse unique : « conçu pour réduire la consommation de jetons en confiant chaque tâche au modèle le moins cher capable de la réussir, avec vérification ». Aucun pourcentage sans comparatif mesuré.

Format vérifié dans la documentation officielle (code.claude.com/docs/en/plugins/manifest-reference, components, create-marketplace, hooks) et par `claude plugin validate` (Claude Code 2.1.318).

## 1. Arborescence et rôle des fichiers

```
kinan-plugin/
├─ .claude-plugin/
│  ├─ plugin.json            manifeste (seul « name » est obligatoire) ; licence et auteur ajoutés après décision
│  └─ marketplace.json       marketplace « kinan » contenant ce seul plugin (source "./") pour /plugin marketplace add
├─ agents/                   découverts automatiquement ; noms d'appel : kinan-orchestre:<fichier>
│  ├─ kinan.md               juge et chef d'orchestre (sonnet), rôle verrouillé
│  ├─ lecture.md             lecture seule (haiku), outils restreints
│  ├─ production.md          production (sonnet)
│  └─ expert.md              difficile (opus)
├─ hooks/
│  ├─ hooks.json             déclaration des hooks (clé racine "hooks"), chemins via ${CLAUDE_PLUGIN_ROOT}
│  ├─ lib/config.js          chargement + validation de kinan.config.json, correspondance nom d'agent -> identifiant
│  ├─ session.js             SessionStart : bloc « ÉQUIPE KINAN » + avis de point de reprise
│  ├─ etat.js                tous événements : state.json, historique, tâches, sessions (repris de l'existant)
│  └─ rappel-relais.js       UserPromptSubmit : rappel au-delà des seuils de relais
├─ skills/
│  ├─ relais/SKILL.md        /kinan-orchestre:relais (écrit .claude/relais.md)
│  └─ projet/                /kinan-orchestre:projet + PROJET-modele.md
├─ config/kinan.config.defaut.json   valeurs par défaut documentées
├─ outils/verifier-config.js         affiche la configuration effective et les alertes
├─ README.md  CHANGELOG.md  CONTRIBUTING.md  SECURITY.md  CODE_OF_CONDUCT.md
└─ SPEC.md                   ce fichier (à retirer ou déplacer dans docs/ avant publication)
```

Choix : `skills/` plutôt que `commands/` (format recommandé par la documentation ; même appel `/kinan-orchestre:relais`). `disable-model-invocation: true` : invoquées seulement par l'utilisateur, description non chargée en permanence.

## 2. Repris, généralisé, exclu

| Élément d'origine | Sort |
|---|---|
| Règles de délégation, effort, vérification, style court, économie de contexte, spec unique | Repris dans `agents/kinan.md`, sans exemple propre au studio |
| Agents lecture / production / expert | Généralisés : fichiers par rôle, nom affiché par la configuration |
| `etat.js` (verrou, écriture atomique, instances, tâches, sessions, journal) | Repris ; agents lus dans la configuration ; préfixe « id : » des missions ; textes neutres |
| `rappel-relais.js` | Repris ; seuils et texte dans la configuration ; commande `/kinan-orchestre:relais` |
| Relais dans la mémoire automatique du projet + ligne CLAUDE.md | Généralisé : `.claude/relais.md` dans le projet, signalé par SessionStart (le CLAUDE.md d'un plugin n'est pas chargé) |
| Fiche PROJET.md | Généralisée (pas seulement pour les sites) |
| `lancer.js` (lance Electron au démarrage) | Exclu du noyau : appartient au tableau de bord optionnel |
| Mails, devis, grille de prix, agents mails et devis, `mesure-fixe.js`, gabarit de site, contrôles `npm run controle` | Exclus (propres au studio) ; « contrôles par scripts » reste une règle de méthode |
| Interdits personnels (dépôt, DNS, formulations), chemins personnels, noms de clients, contenu de `~/.kinan-os` | Exclus ; trois règles de sécurité génériques verrouillées à la place |

## 3. Schéma de `kinan.config.json`

Emplacement : `<dossier d'état>/kinan.config.json`, dossier d'état = `KINAN_OS_DOSSIER` sinon `~/.kinan-os`. Jamais lu dans le projet ouvert (un dépôt cloné ne doit pas pouvoir injecter de texte). Fusion : chaque section remplace la valeur par défaut ; la section `agents`, si présente, remplace toute la liste (permet ajout et retrait).

| Clé | Type, bornes | Défaut | Utilisé par |
|---|---|---|---|
| `version` | entier | 1 | migration future |
| `juge.couleur` / `juge.avatar` | `#rrggbb` / texte ≤ 200 | null | tableau de bord |
| `juge.nom`, `juge.role`, `juge.modele` | **verrouillé** : ignoré, alerte | « Kinan » | — |
| `agents.<id>` | id `^[a-z][a-z0-9-]{0,23}$`, ≤ 8 agents, `kinan` réservé | drafion, skyze, johms | tous |
| `.nom` | texte ≤ 24 | Drafion / Skyze / Johms | contexte, tableau de bord |
| `.base` | `lecture` \| `production` \| `expert` \| autre type d'agent | lecture / production / expert | `subagent_type` |
| `.role` | texte ≤ 160, une ligne | voir fichier par défaut | contexte |
| `.modele` | `haiku` \| `sonnet` \| `opus` \| `inherit` | selon la base : haiku / sonnet / opus | paramètre `model` |
| `.effort` / `.effortHaut` | `low`…`max` | selon la base : low/medium, medium/high, high/xhigh | paramètre `effort` |
| `.couleur` / `.avatar` | `#rrggbb` / texte ≤ 200 | null (choix du tableau de bord) | tableau de bord |
| `.actif` | booléen | true | tous |
| `relais.minutes` | 10…1440 | 120 | rappel |
| `relais.jetons` | 50 000…2 000 000 | 300 000 | rappel |
| `relais.intervalleMinutes` | 5…240 | 20 | rappel |
| `sons` | objet libre | `{ "actif": true }` | tableau de bord seulement |
| `textes.phrasesTravail` | ≤ 10 textes ≤ 60 | 5 phrases neutres | état affiché |
| `textes.rappel` | texte ≤ 400, `{h}` `{m}` `{k}` | null (texte intégré) | rappel |

Verrouillé hors configuration : le fichier `agents/kinan.md` (rôle de contrôle) et les règles de sécurité présentes dans chaque agent. Tout texte injecté est nettoyé (une ligne, sans `< > \``, longueur bornée). Une valeur invalide prend la valeur par défaut et produit une alerte affichée dans le bloc d'équipe et par `outils/verifier-config.js`.

Mécanisme : les fichiers d'agents sont statiques (format plugin) ; les noms, modèles et efforts s'appliquent à l'appel, par les paramètres `subagent_type`, `model` et `effort` de l'outil Agent, que le juge lit dans le bloc « ÉQUIPE KINAN » injecté au démarrage. Un agent ajouté réutilise une base existante (ou `general-purpose`) avec son propre rôle rappelé dans le brief.

## 4. Documentation (plan)

| Fichier | Contenu | État |
|---|---|---|
| README.md | promesse, tableau fonction / où / limite, installation, configuration, lu-écrit-envoyé, option tableau de bord, limites, licence | squelette ; TOKEN OUT à documenter |
| CHANGELOG.md | Keep a Changelog, SemVer | 0.1.0 |
| CONTRIBUTING.md | ticket d'abord, contrôles, règles verrouillées | fait |
| SECURITY.md | signalement, périmètre, garanties | signalement par GitHub Security Advisories |
| CODE_OF_CONDUCT.md | adoption du Contributor Covenant 2.1 par lien | signalement par GitHub Security Advisories |
| LICENSE | texte officiel de la licence choisie | après décision |
| docs/tableau-de-bord.md | installation, Windows seulement, preuve d'absence de réseau | phase 2-3 |

## 5. Licence : deux options

- **MIT** : la plus courte et la plus connue ; adoption maximale ; aucune obligation sauf garder la mention de copyright.
- **Apache-2.0** : permissive aussi, avec licence de brevet explicite, obligation de signaler les fichiers modifiés et fichier NOTICE conservé (attribution plus visible) ; elle précise qu'aucun droit sur les marques n'est accordé (protège le nom « Kinan »).
Recommandation : Apache-2.0 si le nom et l'attribution comptent pour le futur site ; MIT si seule la diffusion compte.

## 6. Risques

1. **Chemins Windows** : forme « shell » `node "${CLAUDE_PLUGIN_ROOT}/hooks/x.js"` ; sous Windows Claude Code utilise Git Bash (sinon PowerShell) et substitue des barres obliques ; les guillemets protègent les espaces. Alternative si un utilisateur n'a ni l'un ni l'autre : forme « exec » (`"command": "node", "args": [...]`), plus récente, à tester avant adoption.
2. **Node absent** du PATH : hooks inopérants (Claude continue). Documenté en prérequis.
3. **Format du journal** (`transcript_path`) non documenté : rappel muet s'il change.
4. **Double hooks** chez un utilisateur qui a déjà des hooks équivalents dans `settings.json` (cas de l'auteur) : état écrit deux fois ; retirer les anciens hooks lors de la migration.
5. **Injection via contenus lus** : seuls des textes fixes, des nombres et la configuration nettoyée de l'utilisateur sont injectés ; relais.md non injecté ; descriptions de mission stockées localement mais jamais réinjectées. Le rapport d'un sous-agent reste une donnée pour le juge (règle verrouillée).
6. **Confidentialité locale** : `sessions.json` contient des chemins de projets, `taches.json` et `historique.jsonl` les descriptions de mission ; non chiffrés, jamais envoyés.
7. **Identification des agents** : sans préfixe « id : », deux agents de même base sont confondus (le premier est retenu).
8. **Dossier d'état** : `~/.kinan-os` (lisible par le tableau de bord) survit à la désinstallation ; `${CLAUDE_PLUGIN_DATA}` serait nettoyé mais introuvable par le tableau de bord.

## 7. Plan de test d'installation

1. `claude plugin validate <dossier>` puis `--strict` : « Validation passed ».
2. `node --check` sur hooks et outils ; événements simulés avec `KINAN_OS_DOSSIER` temporaire (fait en phase 1, voir rapport).
3. Machine ou compte vierge (sans les hooks existants de l'auteur) : `/plugin marketplace add <chemin>`, `/plugin install kinan-orchestre@kinan`, `claude plugin details kinan-orchestre`.
4. `claude --agent kinan-orchestre:kinan` : le bloc ÉQUIPE apparaît ; une mission lecture crée `state.json` et `taches.json` ; `SubagentStop` passe la tâche à « fait ».
5. Rappel : abaisser `relais.minutes` à 10, attendre, vérifier la ligne imposée ; `/kinan-orchestre:relais` puis nouvelle conversation « reprends ».
6. Configuration invalide (juge renommé, modèle inconnu) : alertes affichées, valeurs par défaut appliquées.
7. Désinstallation : plus aucun hook actif ; `~/.kinan-os` conservé (documenté).
8. Sous Windows : chemin d'installation avec espaces ; avec et sans Git Bash.

## 8. Décisions à trancher avant publication

1. Licence : MIT ou Apache-2.0.
2. Auteur, propriétaire du marketplace, adresse de SECURITY / CODE_OF_CONDUCT.
3. Dossier d'état : `~/.kinan-os` (compatible tableau de bord, proposé) ou `${CLAUDE_PLUGIN_DATA}`.
4. Faire de Kinan l'agent principal par défaut à l'installation (fichier `settings.json` du plugin, clé `agent`, à vérifier) ou laisser `claude --agent` (proposé : ne pas imposer).
5. Langue de publication : français seul ou README anglais en plus.

## 9. Décisions prises (6 nov. 2026)
1. Licence Apache-2.0 (`LICENSE`, `NOTICE`). 2. Auteur et propriétaire : Studio Obsidienne ; aucune adresse mail, signalement par GitHub Security Advisories, dépôt `https://github.com/StudioObsidienne/kinan-orchestre`. 3. Dossier d'état `~/.kinan-os`. 4. Pas d'agent principal imposé (`claude --agent kinan-orchestre:kinan`). 5. README en anglais (`README.md`) et en français (`README.fr.md`).
