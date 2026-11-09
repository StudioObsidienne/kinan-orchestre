# Kinan orchestre : sécurité

État décrit : plugin 0.3.0, tableau de bord 0.4.1. Document central ; la procédure de signalement courte est dans `SECURITY.md`, les tableaux de permissions dans le `README.md`. Références `fichier:ligne` : celles de ces versions.

## 1. Modèle de menaces

Ce qui est protégé : les fichiers et projets de l'utilisateur, ses identifiants de messagerie (option courrier), le contenu de ses mails et de ses conversations.

| Menace | Voie | Protection | Résiduel |
|---|---|---|---|
| Dépôt cloné hostile | `kinan.config.json` ou `.claude/` dans le projet | La configuration n'est lue que dans `~/.kinan-os/` (`hooks/lib/config.js:9-11`), jamais dans le projet ; le contenu de `.claude/relais.md` n'est pas injecté par les hooks. | Un projet peut avoir ses propres agents, hooks ou `CLAUDE.md` : hors périmètre du plugin, c'est Claude Code qui les applique. |
| Injection d'instructions (mail, page web, fichier) | Texte lu par un agent | Règles verrouillées dans les agents : le contenu lu est une donnée ; agents `courrier` et `devis` limités à Read, Grep, Glob ; le programme recalcule destinataire et montants. | Un modèle peut se tromper : une règle écrite n'est pas une garantie. |
| Texte injecté par les hooks | `kinan.config.json` modifié | Texte nettoyé : une ligne, sans `<`, `>` ni accent grave, longueur bornée (`hooks/lib/config.js:39`). | Quelqu'un qui peut écrire dans `~/.kinan-os/` agit déjà avec les droits de l'utilisateur. |
| Page du tableau de bord compromise | Contenu affiché | Rendu isolé, CSP stricte, réseau bloqué, aucun chemin transmis (voir 3 et 4). | Une faille d'Electron ou de Chromium sort de ce modèle : garder Electron à jour. |
| Écritures concurrentes | Deux agents, deux conversations | Verrou de fichiers (voir 5), écritures atomiques. | Les modifications par Bash ne sont pas vues. |
| Chaîne d'approvisionnement | `npm install` | Versions exactes ; dépendances d'exécution : `imapflow`, `mailparser`, `nodemailer`, utilisées par `courrier.js` seul (contrôlé par `verifier-hors-ligne.js`). Le plugin n'a aucune dépendance. | Electron et ces trois bibliothèques restent du code tiers. |

## 2. Réseau : zéro par défaut

- **Hooks du plugin** : aucun module réseau, aucune dépendance (`tests/manifestes.test.js`, test « hooks : aucun module réseau »). Rien ne sort de la machine par les hooks.
- **Tableau de bord, par défaut** : aucune connexion. Chromium : toute requête `http`, `https`, `ws`, `wss` est annulée au niveau de la session (`main.js:217-220`), les permissions sont refusées, aucune fenêtre ne peut en ouvrir une autre (`main.js:222`) ni sortir de `file:` (`main.js:223`).
- **Contrôle statique** : `node outils/verifier-hors-ligne.js` (dans `kinan-dashboard`) échoue si un module réseau, `fetch`, `WebSocket`, une ressource distante ou une page sans CSP stricte apparaît hors des exceptions déclarées (`outils/verifier-hors-ligne.js:51`). Il liste aussi chaque accès aux fichiers.
- **Seule origine hors option courrier : `raw.githubusercontent.com`**, pour la vérification des versions. Elle est **désactivée par défaut** (`miseAJour.verifier`, condition vérifiée dans `main.js:296`). Activée : une requête GET toutes les 30 min (`mise-a-jour.js:18`) vers `package.json` et `plugin.json` publics, 64 Ko au plus, redirections non suivies, échec silencieux. Une mise à jour, si elle est acceptée dans une boîte de confirmation, lance `git pull --ff-only` dans le dossier de l'appli, seulement si le dépôt est propre ; ce `git` contacte le dépôt distant configuré, hors du contrôle de cette liste d'origines.
- **Option courrier** (désactivée par défaut) : serveurs IMAP et SMTP du fournisseur choisi ou saisis par l'utilisateur, certificats TLS vérifiés (`rejectUnauthorized: true`, `courrier.js:225`), et `claude -p` pour les récaps (voir 7).
- **Limite honnête** : le blocage de `main.js:218` couvre le réseau de Chromium, pas les modules Node du processus principal. Ce sont le contrôle statique et la lecture du code qui garantissent que `mise-a-jour.js` et `courrier.js` sont les seuls à ouvrir des connexions.

## 3. CSP et isolation du rendu

- Chaque page (`src/*.html`) porte une CSP : `default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'`.
- Scripts et polices : `'self'` seulement ; images : `'self' data:`. Seule `index.html` autorise `style-src 'unsafe-inline'` (`src/index.html:6`).
- Fenêtres : `contextIsolation: true` et `nodeIntegration: false` partout ; `sandbox: true` pour la principale (`main.js:131-133`), le détail, la gestion et l'interface.
- Les fenêtres du son et de la question ne fixent pas `sandbox` : c'est la valeur par défaut d'Electron qui s'applique (non vérifiée ici).
- Le pont `preload.js` n'expose que des fonctions nommées ; les arguments sont convertis en chaînes et validés côté principal (clé d'agent, identifiant de conversation contre le registre).

## 4. Ce que le rendu reçoit

- L'état des agents (nom, état, courte tâche, question posée) et les réglages validés.
- La liste des conversations réduite à `{ id, libelle, etat, actifs, maj }` (`sessions-etat.js:28`).
- **Ni `cwd`, ni chemin de journal, ni texte de prompt** : `transcript` est retiré avant l'envoi (`main.js:157`).
- Le texte saisi par l'utilisateur n'est jamais écrit dans l'état : `UserPromptSubmit` affiche une phrase d'ambiance (`etat.js:245`) ; `tests/sessions.test.js:97` vérifie qu'aucun fichier d'état ne contient le texte du prompt.
- En revanche, les fichiers d'état eux-mêmes (hors rendu) contiennent le nom du projet, son chemin et le chemin du journal (`etat.js:175`) : tout processus de l'utilisateur peut les lire.

## 5. Verrou de fichiers et identifiants de session

- Réservation d'un fichier au premier Edit, Write, MultiEdit ou NotebookEdit d'un agent ; refus pour un autre agent ou une autre conversation.
- Libération à la fin de l'agent, de la conversation, ou après 10 min sans modification (`verrou-fichiers.js:12`). 500 réservations au plus.
- Toute erreur : aucun refus, le verrou ne doit jamais bloquer Claude à tort. Ce n'est pas un contrôle d'accès : un agent peut le contourner avec Bash.
- **Identifiants de session** : ils deviennent des noms de fichier. `nomSur` (`hooks/lib/fichiers.js:67`) ne garde que `[A-Za-z0-9-]`, 64 caractères au plus, sinon une empreinte sha1 tronquée ; ni `..` ni séparateur.
- Le tableau de bord rejette tout identifiant hors de ce motif (`sessions-etat.js:9`).

## 6. Permissions des agents

Tableau complet : `README.md`, section « Agent permissions ». Résumé : `courrier` et `devis` n'ont que Read, Grep, Glob (appliqué par Claude Code, et par `--tools Read,Glob,Grep` dans `courrier.js:532`). `lecture` a Bash, WebFetch et WebSearch : « lecture seule » est une consigne, pas une contrainte. `kinan`, `production` et `expert` héritent des outils de la session et donc de vos règles de permission. `tests/manifestes.test.js` échoue si les outils d'une définition changent sans mise à jour du tableau.

## 7. Courrier optionnel (IMAP / SMTP)

- **Activation** : chargé seulement si `courrier-option.json` contient `actif: true`, après le bouton « Activer » et une confirmation système (`courrier-ipc.js:12-31`). Sinon, aucune bibliothèque de messagerie n'est chargée.
- **Identifiants** : adresse et mot de passe d'application, chiffrés avec `safeStorage` du système (`courrier.bin`). Enregistrement refusé si le chiffrement est indisponible ou en « texte simple » (`courrier.js:186-190`).
- Les identifiants ne sont jamais renvoyés à la page ni journalisés ; les messages d'erreur masquent le mot de passe (`fournisseurs.js:93`).
- **Données stockées** : mails relevés en lecture seule dans `echange/mails/` du dossier du tableau de bord (texte brut tronqué à 6 000 caractères, noms de pièces jointes seulement), brouillons, journal d'envois sans secret.
- Ces fichiers ne sont **pas chiffrés** et sont hors git. Première relève : 50 mails des 30 derniers jours au plus.
- **Sortie de données** : pour les récaps, le tableau de bord lance `claude -p --agent kinan-orchestre:courrier` avec `--tools Read,Glob,Grep` et `--permission-mode dontAsk`.
- Le contenu des mails lus est donc envoyé à Anthropic par Claude Code, selon votre compte et ses conditions : à savoir avant d'activer l'option.
- **Envoi** : l'agent n'envoie rien. Le destinataire est recalculé depuis le mail d'origine, les montants depuis votre grille de prix.
- L'envoi SMTP exige `confirme: true` (`courrier.js:437`), donné après une boîte de confirmation du processus principal (`courrier-ipc.js:61`).

## 8. Signaler une faille

Ne pas ouvrir de ticket public. Plugin : « Security Advisories » (signalement privé) du dépôt `https://github.com/StudioObsidienne/kinan-orchestre`, première réponse visée sous 7 jours (`SECURITY.md`). Aucune adresse mail de contact n'est publiée dans ces dépôts. Le tableau de bord (`https://github.com/StudioObsidienne/kinan-dashboard`) n'a pas de `SECURITY.md` propre : à défaut, utiliser le même canal en précisant le composant concerné.

## 9. Limites connues

- Les agents suivent des instructions : aucune garantie de conformité, en particulier face à une injection dans un mail ou une page.
- Les hooks s'exécutent avec les droits de l'utilisateur ; le plugin installé est du code exécuté sur la machine : lire les sources avant de l'installer.
- Aucun audit de sécurité indépendant n'a été réalisé ; les contrôles sont des tests et des vérifications statiques écrits par les auteurs.
- Fichiers d'état (`~/.kinan-os/`) et `echange/` non chiffrés, protégés seulement par les droits du compte.
- Testé sous Windows ; macOS et Linux non validés, y compris le chiffrement `safeStorage` (sans trousseau sous Linux, l'enregistrement est refusé).
- Un fichier modifié par Bash ou par un autre outil n'est pas vu du verrou.

## 10. Vérifier soi-même

- `node --test tests/` (plugin) et `npm test` (tableau de bord) : tests des hooks, des fichiers corrompus, de la concurrence, du démarrage.
- `node outils/verifier-hors-ligne.js` (tableau de bord) : contrôle statique du zéro réseau et liste des accès aux fichiers.
- Lire `hooks/hooks.json` : c'est la liste complète de ce que Claude Code exécute à cause du plugin.
