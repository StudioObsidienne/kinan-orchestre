> **Mise à jour :** lance `/plugin marketplace update kinan`, puis mets à jour **kinan-orchestre** depuis le menu `/plugin` (onglet Installed) et redémarre Claude Code. Pour les mises à jour automatiques : `/plugin` > Marketplaces > `kinan` > Enable auto-update. Tableau de bord : `git pull` dans son dossier, puis relance.

<p align="center">
  <img src="assets/logo.svg" alt="Logo Kinan orchestre : un juge en perruque blanche tenant un marteau" width="96" height="96">
</p>

<h1 align="center">Kinan orchestre</h1>

<p align="center">Plugin Claude Code conçu pour réduire la consommation de jetons : chaque tâche va au modèle le moins cher capable de la réussir, et un juge vérifie le résultat.</p>

<p align="center"><a href="README.md">English</a> | <b>Français</b> | <a href="https://kinan-orchestre-site.vercel.app/">Site web</a></p>

https://github.com/user-attachments/assets/04b19d7e-5a4e-4bde-993d-5b7ff8587252

<p align="center"><sub>Teaser de 45 secondes (muet). Les plans du tableau de bord utilisent des données de démonstration.</sub></p>

<p align="center"><code>Apache-2.0</code> &nbsp;·&nbsp; <code>version 0.2.0</code> &nbsp;·&nbsp; <code>Plugin Claude Code</code></p>

> État : version 0.2.0, version de départ (ajoute le courrier optionnel). Les manifestes passent `claude plugin validate` (y compris `--strict`). Testé sous Windows sur l'ordinateur de testeurs, premiers retours déjà intégrés. Une prochaine version est en cours.

## Pourquoi

Un seul gros modèle pour toutes les demandes est plus capable que la plupart d'entre elles ne l'exigent, et il est facturé en conséquence. Kinan orchestre place une petite équipe d'agents devant votre travail : un juge lit la demande, la confie à un agent de lecture, de production ou expert, et vérifie ce qui revient avant de vous répondre.

Aucun chiffre d'économie n'est annoncé. Un comparatif mesuré (même tâche, un seul gros modèle contre l'équipe) n'a pas encore été publié, et le plugin n'avance pas un nombre qu'il ne peut pas montrer.

```
 votre demande
      |
      v
+-----------+      brief      +-----------------------+
|   Kinan   | --------------> |  lecture     (haiku)  |
|  (juge)   |                 |  production  (sonnet) |
|           | <-------------- |  expert      (opus)   |
+-----------+     rapport     +-----------------------+
      |
      |  relit le diff ou relance le contrôle
      v
 réponse pour vous
```

## Fonctions et limites connues

| Fonction | Où | Limite connue |
|---|---|---|
| Équipe d'agents : un juge (Kinan) confie chaque tâche à l'agent le moins cher capable (lecture, production, expert) | plugin | Le choix est fait par un modèle qui suit des règles écrites ; il peut se tromper de niveau. |
| Vérification impartiale : le juge relit le diff ou relance le contrôle avant de répondre | plugin | Le juge est lui-même un modèle ; il ne remplace pas une relecture humaine. |
| Effort réglé par agent (valeur courante et valeur « difficile ») | plugin | Dépend de la prise en charge du paramètre d'effort par votre version de Claude Code et par le modèle. |
| Suivi en temps réel de plusieurs conversations (boîte et bulles) | données : plugin ; affichage : tableau de bord | Une conversation n'apparaît qu'au premier événement qu'elle envoie ; retirée après 24 h sans événement. Agent identifié par le préfixe « id : » de la mission, sinon par son type. |
| Relais automatique entre conversations : rappel au-delà d'un seuil (2 h ou 300 000 jetons par défaut), note de reprise, reprise par « reprends » | plugin | Le seuil est calculé à partir du journal local de la conversation, dont le format n'est pas une interface documentée ; s'il change, le rappel se tait. La reprise vaut ce que vaut la note. |
| Prochain relais (temps et jetons restants) | tableau de bord | Estimation à partir du journal local. |
| Rapport d'économies sur 3 h | tableau de bord | Estimation au tarif public de l'API, pas une facture ; un abonnement n'est pas facturé ainsi. |
| Alerte TOKEN OUT : affichée quand Claude Code écrit dans ses journaux qu'une limite d'utilisation (5 h ou hebdomadaire) est atteinte, avec l'heure de reprise et un compte à rebours | tableau de bord | Détection toutes les 30 s dans la fin des journaux récents de Claude Code ; leur format n'est pas une interface documentée. Texte illisible : reprise affichée comme inconnue. |
| Journal des événements (2 000 dernières lignes) | plugin | Local, non chiffré ; contient les descriptions de mission. |
| Verrou de fichiers entre agents (`KINAN_VERROU`) : un fichier en cours de modification par un agent lui est réservé ; un second agent est refusé, ou seulement averti avec `KINAN_VERROU=avertir` (voir « Sécurité et vie privée ») | plugin | Les modifications faites par Bash ne sont pas vues. La réservation expire après 10 minutes sans modification. En cas d'erreur, rien n'est refusé. |
| Sons | tableau de bord | Réglage `sons` du fichier de configuration. |
| Thème (couleurs, polices, logo) | enregistré et validé par le plugin ; appliqué par le tableau de bord | Le plugin ne change rien à l'écran par lui-même. Sans le tableau de bord, le thème n'a pas d'effet visible. |
| Didacticiel de premier lancement (`/kinan-orchestre:demarrage`) | plugin | Lit une seule page, celle que vous indiquez ; les couleurs et polices relevées sont approximatives et vous sont présentées pour validation avant toute écriture. |
| Réservation des fichiers : un fichier du projet en cours de modification par un agent lui est réservé ; un autre agent (ou une autre conversation) qui veut le modifier est refusé et invité à signaler le conflit | plugin (`hooks/verrou-fichiers.js`) | Couvre Edit, Write, MultiEdit et NotebookEdit, pas les fichiers modifiés par Bash. Deux sous-agents d'une même conversation ne sont distingués que si Claude Code transmet leur `agent_id` au hook. Une réservation prend fin avec l'agent, ou après 10 minutes sans nouvelle modification. En cas d'erreur, rien n'est refusé. |
| Fiche de projet `PROJET.md` (`/kinan-orchestre:projet`) | plugin | Le modèle remplit seulement ce qu'il peut vérifier ; le reste est à compléter. |
| Contrôles par scripts : le juge préfère un script qui rend un résumé court à la lecture de pages entières | méthode | Le plugin ne fournit pas de script de contrôle : à écrire pour chaque projet. |
| Courrier et devis : récap des nouveaux mails (une ligne par point), brouillons de réponse, brouillons de devis à partir de votre grille de prix | agents `courrier` (Haiku) et `devis` (Sonnet) : plugin ; boîte mail, validation et envoi : onglet Courrier du tableau de bord, optionnel et désactivé par défaut | Les agents ne font que lire (Read, Glob, Grep) et répondent par un bloc JSON contrôlé par le tableau de bord. Les montants sont calculés par le tableau de bord depuis votre grille, jamais par le modèle. Rien n'est envoyé sans votre validation et une confirmation du système. Voir [Courrier et devis](#courrier-et-devis). |

Les instructions des agents et des compétences sont rédigées en français. Le juge répond dans la langue que vous utilisez.

Numéros de version : le plugin et l'appli kinan-dashboard sont deux éléments distincts, avec chacun leur numéro (par exemple plugin 0.2.1, dashboard 0.2.6). Le tableau de bord affiche les deux (« Dashboard » et « Plugin »). Mettre l'un à jour ne met pas l'autre à jour : le plugin se met à jour dans Claude Code, le tableau de bord avec `git pull`.

## Installation

Prérequis : Claude Code et Node.js accessible par la commande `node`.

```
/plugin marketplace add https://github.com/StudioObsidienne/kinan-orchestre
/plugin install kinan-orchestre@kinan
claude --agent kinan-orchestre:kinan
```

Les deux premières lignes se tapent dans Claude Code (un chemin local vers ce dossier convient aussi pour la première). La troisième ouvre, depuis votre terminal, une conversation avec le juge. Le plugin n'impose pas d'agent principal par défaut : vous choisissez quand l'utiliser.

**Réglage recommandé :** pour que le juge fonctionne comme prévu, choisissez **Sonnet 5.5** avec un effort **moyen** dans le chat Claude principal (sélecteurs de modèle et d'effort, ou `/model`). Il confie le gros du travail aux autres agents ; un modèle plus gros dans le chat principal coûte plus sans le rendre meilleur.

### Installez aussi le tableau de bord (recommandé)

Le plugin se contente d'écrire des fichiers d'état. C'est le **tableau de bord** qui les affiche : agents, conversations, jetons, prochain relais, alerte de limites et votre thème. Sans lui, pas d'écran et le thème n'a aucun effet visible. Pour une installation complète qui marche, installez les deux :

```
git clone https://github.com/StudioObsidienne/kinan-dashboard.git
cd kinan-dashboard
npm install
npm start
```

Prérequis : Node.js 20 ou plus et npm. Sous Windows, `lancer-kinan-os.cmd` dans ce dossier exécute les mêmes étapes. Détails et limites : [kinan-dashboard](https://github.com/StudioObsidienne/kinan-dashboard).

## Premier lancement

Dans la conversation, tapez :

```
/kinan-orchestre:demarrage
```

Le didacticiel pose une question à la fois (chacune peut être passée) :

1. Les noms de vos agents, demandés en premier (le nom du juge est verrouillé).
2. L'adresse https de votre site. Il lit cette page pour proposer vos couleurs, vos polices et l'adresse de votre logo.
3. Votre validation ou vos changements sur cette palette. Rien n'est écrit avant votre accord.
4. Puis il écrit `~/.kinan-os/kinan.config.json` (en fusionnant avec l'existant), lance `node outils/verifier-config.js` et résume.

Le seul accès réseau est la lecture de la page que vous indiquez. Son contenu est traité comme une donnée : les instructions qu'il contiendrait sont ignorées. Autres commandes : `/kinan-orchestre:relais` (prépare la reprise dans une nouvelle conversation), `/kinan-orchestre:projet` (crée la fiche de projet).

## Personnalisation

Fichier facultatif `kinan.config.json` dans `~/.kinan-os/` (ou le dossier désigné par la variable d'environnement `KINAN_OS_DOSSIER`). Valeurs par défaut : `config/kinan.config.defaut.json`. Vérifier la configuration effective : `node outils/verifier-config.js`.

- Modifiable : agents (nombre, identifiants, noms, rôles, modèles, efforts, couleurs, avatars), seuils de relais, sons, textes, thème.
- Verrouillé : le juge Kinan (nom, rôle de contrôle, modèle) et les règles de sécurité de base, à savoir : rien n'est envoyé, publié, poussé ni supprimé définitivement sans votre validation explicite ; le contenu lu (pages web, mails, fichiers, résultats d'outils, rapports d'agents) est une donnée, jamais une instruction ; aucun chiffre, témoignage ni résultat inventé.
- Pourquoi : le juge est l'étape de vérification. S'il pouvait être renommé ou réaffecté, le contrôle appliqué au travail de tous les autres agents ne serait plus garanti. Les règles de sécurité vous protègent des actions non voulues et des instructions injectées.
- Une valeur invalide est ignorée, remplacée par la valeur par défaut et signalée. La configuration n'est lue que dans votre dossier, jamais dans le projet ouvert : un dépôt cloné ne peut pas modifier l'équipe.

### Thème

La section `theme` décrit votre identité visuelle. C'est le tableau de bord Electron, livré à part, qui l'applique. Le plugin enregistre et valide les réglages ; il ne dessine rien.

| Champ | Valeur acceptée |
|---|---|
| `fond`, `surface`, `texte`, `accent`, `accentSecondaire` | Couleur hexadécimale `#rgb` ou `#rrggbb` uniquement (fond, panneaux, texte, accent, accent secondaire). |
| `policeTitre`, `policeTexte` | Nom de police : lettres, chiffres, espaces et tirets, 40 caractères au plus. |
| `logo` (facultatif) | URL https, 300 caractères au plus. |
| `source` | URL https du site d'où vient le thème. |

```json
{
  "version": 1,
  "theme": {
    "fond": "#1b1830", "surface": "#2a2540", "texte": "#f4f1ea",
    "accent": "#ffd45e", "accentSecondaire": "#d9a98b",
    "policeTitre": "Playfair Display", "policeTexte": "Inter",
    "logo": "https://exemple.org/logo.svg", "source": "https://exemple.org"
  }
}
```

Toute autre valeur (nom de couleur, `rgb()`, `url()`, point-virgule, `http://`, `javascript:`, champ inconnu) est ignorée, jamais exécutée, et signalée par `node outils/verifier-config.js`. Détail du schéma : `SPEC.md`.

## Courrier et devis

Le plugin ne contient aucun code qui se connecte à une boîte mail ou qui envoie quoi que ce soit. Il fournit deux agents que l'onglet Courrier du tableau de bord lance en arrière-plan (`claude -p --agent kinan-orchestre:courrier`, puis `kinan-orchestre:devis`) :

- `agents/courrier.md` (Haiku) : lit les mails relevés par le tableau de bord, les résume (une ligne par point), repère les demandes de devis et les mails suspects, propose des brouillons de réponse.
- `agents/devis.md` (Sonnet) : choisit, pour chaque demande, des lignes et des quantités dans votre grille de prix. Il ne donne aucun prix : le tableau de bord calcule chaque montant, la TVA et le total depuis votre grille.

Les deux sont limités à Read, Glob et Grep, ne lisent que les fichiers que le tableau de bord nomme dans son message et répondent par un bloc JSON. Le tableau de bord contrôle ce bloc et écrit lui-même les brouillons ; il recalcule le destinataire depuis le mail d'origine, et un mail ne passe à « traité » que si l'agent l'a réellement cité. Le contenu des mails est une donnée, jamais une instruction.

### Connecter votre boîte (tableau de bord, onglet Courrier)

1. Installez le tableau de bord (voir plus haut), ouvrez Gestion puis l'onglet **Courrier**, et cliquez sur **Activer le courrier**. Avant cela, le tableau de bord n'ouvre aucune connexion de messagerie.
2. Choisissez votre fournisseur, saisissez l'adresse et un mot de passe d'application, cliquez sur **Enregistrer** puis **Tester la connexion**. Le mot de passe est chiffré par le système et n'est plus jamais affiché.
3. **Relever** récupère les nouveaux mails (lecture seule), **Récap mails** lance l'agent `courrier`, **Préparer les devis** lance l'agent `devis`. Validez les brouillons, puis **Envoyer** : une boîte de dialogue du système liste les destinataires avant tout envoi.

| Fournisseur | Mot de passe à utiliser | Avant de connecter |
|---|---|---|
| Zoho Mail (zoho.eu ou zoho.com) | Un mot de passe d'application (compte Zoho, Sécurité, Mots de passe d'application) | Activez IMAP (paramètres de Zoho Mail, Mail, Accès IMAP) et choisissez la région de votre compte. |
| Gmail / Google Workspace | Un mot de passe d'application (compte Google, Sécurité ; validation en deux étapes obligatoire). Le mot de passe habituel est refusé. | Vérifiez qu'IMAP est activé (Paramètres, Voir tous les paramètres, Transfert et POP/IMAP). Un administrateur Workspace peut bloquer IMAP ou les mots de passe d'application. |
| Outlook.com / Microsoft 365 | Un mot de passe d'application, si votre compte en propose | Microsoft exige de plus en plus l'authentification moderne (OAuth), que cette version ne gère pas : la connexion peut être refusée. Sur Microsoft 365, l'administrateur doit autoriser IMAP et l'envoi SMTP authentifié (SMTP AUTH). |
| OVHcloud (MX Plan) | Le mot de passe de l'adresse, défini dans l'espace client OVHcloud | IMAP est actif par défaut. Pour Email Pro ou Exchange, choisissez « Autre » avec les serveurs indiqués dans votre espace client. |
| iCloud Mail | Un mot de passe pour app (compte Apple, Connexion et sécurité ; double authentification obligatoire) | Si la connexion échoue, mettez dans « Identifiant » la partie de l'adresse avant le @. |
| Autre | Celui que votre fournisseur indique pour IMAP et SMTP | Saisissez serveur, port et sécurité (SSL/TLS ou STARTTLS) pour IMAP et SMTP. Un nom de serveur est exigé (ni adresse IP, ni localhost) ; la connexion non chiffrée n'est pas proposée. |

Les devis demandent votre propre grille de prix : copiez `examples/grille-prix.exemple.json` (fictive) sous le nom `grille-prix.json` dans le dossier `echange` du tableau de bord, puis remplacez ses lignes par vos prestations et vos prix. Les lignes facultatives `mentions` (mentions légales, conditions de paiement) sont imprimées en bas du PDF.

### Brancher un autre système

`examples/` garde des modèles pour une autre installation (serveur MCP de messagerie, script ou API) : `examples/agents/courrier.md`, `examples/agents/devis.md`, `examples/calculer-devis.exemple.js`. Le guide `docs/ETENDRE.md` explique comment brancher un système, ajouter un agent et quelles règles de sécurité conserver.

## Permissions des agents

| Agent | Modèle par défaut | Outils autorisés | Remarques |
|---|---|---|---|
| `kinan` (juge) | sonnet | Tous les outils de la session (pas de champ `tools`) | Délègue, lit les diffs, relance les contrôles, fait lui-même les petites tâches. Tenu par les règles de sécurité verrouillées. |
| `lecture` | haiku | Read, Grep, Glob, Bash, WebFetch, WebSearch | Présenté comme lecture seule, mais Bash peut modifier des fichiers : ici, la lecture seule est une consigne, pas une contrainte. |
| `production` | sonnet | Tous les outils de la session | Écrit des fichiers. |
| `expert` | opus | Tous les outils de la session | Écrit des fichiers. |
| `courrier` | haiku | Read, Grep, Glob | Lecture seule imposée : ni shell, ni réseau, ni écriture. |
| `devis` | sonnet | Read, Grep, Glob | Lecture seule imposée : ni shell, ni réseau, ni écriture. |

« Tous les outils de la session » : ce que votre session Claude Code autorise, selon vos propres réglages de permissions (`/permissions`, mode de permission) ; le plugin n'accorde rien de plus. Un agent ajouté dans `kinan.config.json` reprend l'une de ces définitions (`base`) ou un type d'agent que vous nommez, avec ses outils. `tests/manifestes.test.js` échoue si les outils d'une définition changent sans que ce tableau soit mis à jour.

## Sécurité et vie privée

Les hooks du plugin n'ouvrent aucune connexion réseau et n'ont aucune dépendance externe. Un hook peut refuser un outil : `verrou-fichiers.js` refuse la modification d'un fichier réservé par un autre agent actif ; en cas d'erreur, il ne refuse rien.

Par défaut, le verrou refuse l'écriture. Avec la variable d'environnement `KINAN_VERROU=avertir`, l'écriture est permise et l'agent reçoit seulement un avertissement.

```bash
# macOS / Linux (session en cours)
export KINAN_VERROU=avertir
```

```powershell
# Windows PowerShell (session en cours)
$env:KINAN_VERROU='avertir'
# Windows, permanent (pour les terminaux ouverts ensuite)
setx KINAN_VERROU avertir
```

Lu : l'événement envoyé par Claude Code au hook ; le début (64 Ko) et la fin (512 Ko) du journal local de la conversation, pour la durée et la taille du contexte ; `kinan.config.json` ; l'existence et la date de `.claude/relais.md` (pas son contenu).

Ajouté au contexte du modèle : la composition de l'équipe (début de conversation), l'avis de point de reprise, le rappel de relais. Les textes issus de la configuration sont nettoyés (une ligne, sans chevrons ni accents graves, longueur bornée).

Écrit dans `~/.kinan-os/` : `state.json`, `state.lock` (temporaire), `historique.jsonl`, `taches.json`, `sessions.json` (nom et chemin du projet, chemin du journal), `agents-ids.json`, `rappels.json`, `fichiers-verrous.json` (chemins des fichiers en cours de modification par un agent, gardés 10 minutes au plus), `fichiers.lock` et `rappels.lock` (temporaires). Le texte de vos messages n'est jamais enregistré ; les descriptions de mission écrites par le juge le sont. Ces fichiers ne sont pas chiffrés et ne sont pas supprimés à la désinstallation.

Écrit dans le projet, à votre demande : `.claude/relais.md`, `PROJET.md`.

Jamais envoyé : rien ne quitte votre machine par les hooks. Le didacticiel lit la seule page que vous indiquez, par l'outil de lecture web de Claude Code. Pour signaler une vulnérabilité, voir `SECURITY.md`.

### Tableau de bord (recommandé, testé sous Windows)

Une application Electron affiche l'état des agents et des conversations à partir des fichiers de `~/.kinan-os/` et applique `theme`. C'est un dépôt séparé, [kinan-dashboard](https://github.com/StudioObsidienne/kinan-dashboard), non inclus dans ce plugin : installez-le pour une configuration complète. Testé uniquement sous Windows. En plus des fichiers ci-dessus, elle lit la fin des journaux récents de Claude Code (`~/.claude/projects`) pour le rappel de relais et l'alerte TOKEN OUT. Par défaut, elle n'ouvre aucune connexion réseau. Deux options en ouvrent, seulement une fois activées : la vérification des mises à jour (`raw.githubusercontent.com`) et l'onglet Courrier (les serveurs IMAP et SMTP de la boîte que vous choisissez, plus `claude -p` pour les récaps, qui utilise votre compte Claude comme toute session Claude Code). `npm run verifier` dans le dossier du tableau de bord contrôle ces règles de façon statique ; son README liste chaque connexion et chaque fichier lu ou écrit.

### Limites générales

- Les agents suivent des consignes écrites : leur respect n'est pas garanti.
- Hooks couverts par des tests automatisés à événements simulés (`node --test tests/` : fonctionnement normal, erreurs et fichiers corrompus, concurrence) ; lancés sous Windows seulement, comportement sous macOS et Linux non testé.
- Les règles propres à votre projet vont dans votre `CLAUDE.md` ou `PROJET.md`, pas dans le plugin.
- Installation chez un tiers : non testée tant que ce n'est pas fait.

## Aide et économie de jetons

- [Problèmes connus et solutions](docs/GALERES.md) : ce qui peut mal tourner à l'installation et comment le corriger.
- [Master prompt](docs/PROMPT-MASTER.md) : un prompt à coller, pour que votre assistant respecte les réglages de Kinan à chaque demande et consomme moins de jetons.

## Contribuer

Ouvrez un ticket avant un changement important (nouvel agent par défaut, nouvel événement de hook, changement du schéma de configuration). Un changement par demande de fusion, avec une ligne dans `CHANGELOG.md`. Détails, dont les contrôles à lancer : `CONTRIBUTING.md`. Conduite : `CODE_OF_CONDUCT.md`. Tenez `README.md` et `README.fr.md` à jour ensemble.

## Licence

Apache License 2.0, copyright Studio Obsidienne. Voir `LICENSE` et `NOTICE`. La licence n'accorde aucun droit sur les noms ou marques du projet.

## Pistes d'amélioration
Les pistes d'amélioration sont dans [ROADMAP.fr.md](ROADMAP.fr.md). La phase 1 est en partie faite (tests automatisés, gestion des erreurs, concurrence, permissions) ; restent le test d'installation sur une machine extérieure et la démonstration publique. Le reste n'est pas encore en place : fondations et tests, benchmark reproductible des économies, routage et vérification plus fiables, puis le tableau de bord comme produit. Aucun chiffre n'est annoncé tant qu'il n'est pas mesuré.
