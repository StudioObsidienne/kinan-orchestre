# Kinan orchestre : architecture

État décrit : plugin 0.3.0 (`kinan-orchestre`), tableau de bord 0.4.1 (`kinan-dashboard`, dépôt séparé). Les références `fichier:ligne` valent pour ces versions ; elles bougent avec le code. Ce document décrit ce que le code fait, pas ce qui est prévu (voir `ROADMAP.md`).

## 1. Composants

| Composant | Où | Rôle |
|---|---|---|
| Plugin | `kinan-plugin/` (`.claude-plugin/plugin.json`) | Défini pour Claude Code : agents, hooks, skills, configuration par défaut. Ne contient aucun serveur ni code d'envoi. |
| Agents | `agents/*.md` | Six définitions (juge `kinan`, `lecture`, `production`, `expert`, `courrier`, `devis`), appelées `kinan-orchestre:<nom>`. Ce sont des instructions et une liste d'outils (frontmatter `model`, `tools`). |
| Hooks | `hooks/hooks.json`, `hooks/*.js` | Scripts Node lancés par Claude Code sur chaque événement. Ils écrivent l'état dans `~/.kinan-os/` et ajoutent du texte au contexte (équipe, rappel de relais). 0 jeton, aucun réseau. |
| Skills | `skills/demarrage`, `projet`, `relais` | Commandes pour l'utilisateur (point de reprise `.claude/relais.md`, `PROJET.md`). |
| Configuration | `config/kinan.config.defaut.json` + `~/.kinan-os/kinan.config.json` | Équipe, seuils du relais, thème, textes. Lue par `hooks/lib/config.js:65` (`charger`), validée valeur par valeur. |
| Tableau de bord | `kinan-dashboard/` (Electron 45) | Affiche l'état local. Optionnel : le plugin fonctionne sans lui. Deux options, désactivées par défaut : vérification des versions, courrier. |

Deux dépôts, un seul contrat : les fichiers de `~/.kinan-os/` (ou du dossier `KINAN_OS_DOSSIER`, `hooks/lib/config.js:9`, relu par `kinan-dashboard/config.js`). Le plugin écrit, le tableau de bord lit ; seules exceptions, `taches.json` et `reglages.json` (voir 3).

## 2. Schéma

```
 Claude Code (conversation A, B...)           Claude Code lance chaque hook (node, JSON sur stdin)
      | événements : SessionStart, UserPromptSubmit, PreToolUse,
      |   SubagentStart/Stop, PostToolUseFailure, Notification, Stop, SessionEnd
      v
 +--------------------------- plugin ---------------------------+
 | hooks.json -> session.js    (stdout = équipe + point de reprise) -> contexte du modèle
 |            -> rappel-relais.js (stdout = rappel, lit la fin du journal de conversation)
 |            -> verrou-fichiers.js (Edit/Write...) : refuse ou laisse passer
 |            -> etat.js       (écrit l'état, ne dit rien)
 +----------------------------+---------------------------------+
                              | écritures atomiques, sous state.lock
                              v
 ~/.kinan-os/  state.json (miroir)   sessions.json (registre)   sessions/<sid>.json
               taches.json   historique.jsonl   agents-ids.json   rappels.json
               fichiers-verrous.json   kinan.config.json (écrit par l'utilisateur)
                              |  lecture seule, cache mtime+taille
                              v
 +-------------------------- dashboard --------------------------+
 | main.js (processus principal, accès fichiers) --IPC--> preload.js --> rendu (CSP stricte, sans chemins)
 | + lit la fin de ~/.claude/projects/**/*.jsonl (jetons, relais)
 | + option courrier : IMAP/SMTP, `claude -p --agent kinan-orchestre:courrier`
 +---------------------------------------------------------------+
```

## 3. Flux de données

1. **Événement.** Claude Code lance les hooks déclarés dans `hooks/hooks.json` avec un délai maximal de 10 s. `etat.js` lit l'événement (`etat.js:218`), prend le verrou, puis écrit `sessions/<sid>.json` (`etat.js:224-228`) et le miroir `state.json` (`ecrireMiroir`, `etat.js:205`). `majSessions` (`etat.js:166`) tient le registre `sessions.json` (début, fin, projet, cwd, chemin du journal).
2. **Identifiant de conversation.** `nomSur` (`hooks/lib/fichiers.js:67`) garde l'identifiant s'il ne contient que `[A-Za-z0-9-]` (64 caractères au plus), sinon une empreinte sha1 tronquée : jamais de `..` ni de séparateur dans un nom de fichier. Le tableau de bord applique le même filtre (`sessions-etat.js:9`).
3. **Missions.** Un appel à l'outil `Agent` crée une tâche dans `taches.json` (`ajouterTache`, `etat.js:104`) ; `SubagentStart` lui lie l'identifiant de l'agent (`lierAgentId`, `etat.js:119`) ; `SubagentStop` la passe à « fait » (`marquerFait`, `etat.js:134`). Une mission « en cours » depuis plus de 4 h repasse « à faire » (`TACHE_BLOQUEE`, `etat.js:25`).
4. **Lecture.** Le processus principal du tableau de bord relit ces fichiers seulement s'ils ont changé (`lecture-cache.js`), applique les délais d'affichage (`etat-delai.js`), et envoie une fois par seconde un état au rendu s'il a changé (`main.js:157`). Le rendu ne reçoit ni chemin ni journal (`main.js:157`, `sessions-etat.js:28`).
5. **Journaux de conversation.** Le tableau de bord lit aussi la fin de `~/.claude/projects/**/*.jsonl` : jetons et coût estimé (`economies.js`, `gestion-ipc.js:183`), rappel de relais (`relais.js`). Ce format est celui de Claude Code, non documenté comme interface ; s'il change, ces vues se taisent ou se trompent, sans toucher aux hooks d'état.
6. **Écritures du tableau de bord.** Il écrit `taches.json` (saisie manuelle) et `reglages.json` (fenêtre, libellés, tarifs), avec le même protocole de verrou que les hooks (`gestion-ipc.js:27-40`).

## 4. Verrous et concurrence

- **`state.lock`** : un verrou commun à tous les fichiers d'état, création exclusive (`openSync 'wx'`), jeton de propriétaire, reprise d'un verrou de plus de 3 s (`hooks/lib/fichiers.js:33`), environ 1,5 s d'attente (`etat.js:150`). Si le verrou n'est pas obtenu, le hook continue : un état légèrement faux vaut mieux qu'un hook bloqué.
- **Écriture atomique** : fichier temporaire puis renommage, 3 essais sous Windows (`fichiers.js:18`). Lecture tolérante : un fichier corrompu (`null`, tableau, JSON tronqué) donne un état vide et est réparé au premier événement (`fichiers.js:9`, `etat.js:29`).
- **Verrou de fichiers du projet** (`hooks/verrou-fichiers.js`, `fichiers.lock`) : un fichier modifié par un agent lui est réservé ; un autre agent ou une autre conversation reçoit un refus (`permissionDecision: deny`, `verrou-fichiers.js:73`) jusqu'à la fin de l'agent ou 10 min sans modification (`DUREE`, `:12`). `KINAN_VERROU=avertir` remplace le refus par un avertissement. Limites : une modification par Bash n'est pas vue ; sans `agent_id`, deux sous-agents d'une même conversation ne sont pas distingués.
- **Une seule fenêtre** côté tableau de bord : `requestSingleInstanceLock` (`main.js:205`).

## 5. Compatibilité de versions

| Plugin | Tableau de bord | Comportement |
|---|---|---|
| 0.3.0 | 0.4.x | Complet : pastilles par conversation, vue « Toutes ». |
| 0.2.2 | 0.4.x | Pas de `sessions/` : lecture de `state.json`, barre des conversations masquée (`main.js:70`, `docs/SPEC-MULTI-CONVERSATIONS.md` §5). |
| 0.3.0 | 0.3.x | `state.json` reste écrit comme avant (miroir de la dernière conversation active). |

Tout est testé en simulant des fichiers et des événements (`node --test tests/` : 47 tests ; `npm test` du tableau de bord : 156 tests, dont un démarrage réel d'Electron) ; aucun test ne couple les deux dépôts dans une vraie session Claude Code. Le tableau de bord ne vérifie pas la version du plugin au démarrage : un format de fichier inconnu est ignoré, pas signalé. Les versions se comparent seulement dans la vérification optionnelle des mises à jour (`mise-a-jour.js:24`).

## 6. Étendre : ajouter un agent

1. Écrire `agents/<nom>.md` dans le plugin, ou `.claude/agents/<nom>.md` dans un projet (modèle dans `examples/agents/`) : `name`, `description`, `model`, `tools`, instructions.
2. Le déclarer dans `~/.kinan-os/kinan.config.json`, section `agents` (elle remplace la liste par défaut ; 8 agents au plus, `hooks/lib/config.js:17`). `base` vaut `lecture`, `production`, `expert` ou le nom de l'agent. Vérifier avec `node outils/verifier-config.js`.
3. Nouvelle session : l'équipe est lue au `SessionStart` (`session.js:14`). `etat.js` reconnaît l'agent par `subagent_type`, ou par une description de mission commençant par `<id> :` (`etat.js:17`).
4. Si l'agent ajoute un accès (écriture, shell, réseau), le documenter dans le tableau « Agent permissions » du README ; `tests/manifestes.test.js` échoue si les outils d'une définition changent sans cela. Détail : `docs/ETENDRE.md`.

## 7. Limites d'architecture

- Le couplage passe par des fichiers JSON sans schéma versionné ; un changement de format demande de modifier les deux dépôts.
- Les agents suivent des instructions écrites : leur respect n'est pas garanti. Seuls les hooks et les listes `tools` sont appliqués par Claude Code.
- Testé sous Windows seulement ; macOS et Linux ne sont pas validés.
