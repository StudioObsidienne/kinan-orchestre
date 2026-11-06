> **Mise à jour :** lance `/plugin marketplace update kinan`, puis mets à jour **kinan-orchestre** depuis le menu `/plugin` (onglet Installed) et redémarre Claude Code. Pour les mises à jour automatiques : `/plugin` > Marketplaces > `kinan` > Enable auto-update. Tableau de bord : `git pull` dans son dossier, puis relance.

<p align="center">
  <img src="assets/logo.svg" alt="Logo Kinan orchestre : un juge en perruque blanche tenant un marteau" width="96" height="96">
</p>

<h1 align="center">Kinan orchestre</h1>

<p align="center">Plugin Claude Code conçu pour réduire la consommation de jetons : chaque tâche va au modèle le moins cher capable de la réussir, et un juge vérifie le résultat.</p>

<p align="center"><a href="README.md">English</a> | <b>Français</b></p>

https://github.com/user-attachments/assets/04b19d7e-5a4e-4bde-993d-5b7ff8587252

<p align="center"><sub>Teaser de 45 secondes (muet). Les plans du tableau de bord utilisent des données de démonstration.</sub></p>

<p align="center"><code>Apache-2.0</code> &nbsp;·&nbsp; <code>version 0.1.0</code> &nbsp;·&nbsp; <code>Plugin Claude Code</code></p>

> État : version 0.1.0, première version. Les manifestes passent `claude plugin validate` (y compris `--strict`). Installation chez un tiers pas encore testée.

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
| Sons | tableau de bord | Réglage `sons` du fichier de configuration. |
| Thème (couleurs, polices, logo) | enregistré et validé par le plugin ; appliqué par le tableau de bord | Le plugin ne change rien à l'écran par lui-même. Sans le tableau de bord, le thème n'a pas d'effet visible. |
| Didacticiel de premier lancement (`/kinan-orchestre:demarrage`) | plugin | Lit une seule page, celle que vous indiquez ; les couleurs et polices relevées sont approximatives et vous sont présentées pour validation avant toute écriture. |
| Fiche de projet `PROJET.md` (`/kinan-orchestre:projet`) | plugin | Le modèle remplit seulement ce qu'il peut vérifier ; le reste est à compléter. |
| Contrôles par scripts : le juge préfère un script qui rend un résumé court à la lecture de pages entières | méthode | Le plugin ne fournit pas de script de contrôle : à écrire pour chaque projet. |
| Courrier et devis | vos propres agents | Non inclus. Des modèles et un guide sont fournis, voir [Étendre](#étendre--courrier-et-devis). |

Les instructions des agents et des compétences sont rédigées en français. Le juge répond dans la langue que vous utilisez.

## Installation

Prérequis : Claude Code et Node.js accessible par la commande `node`.

```
/plugin marketplace add https://github.com/StudioObsidienne/kinan-orchestre
/plugin install kinan-orchestre@kinan
claude --agent kinan-orchestre:kinan
```

Les deux premières lignes se tapent dans Claude Code (un chemin local vers ce dossier convient aussi pour la première). La troisième ouvre, depuis votre terminal, une conversation avec le juge. Le plugin n'impose pas d'agent principal par défaut : vous choisissez quand l'utiliser.

## Premier lancement

Dans la conversation, tapez :

```
/kinan-orchestre:demarrage
```

Le didacticiel pose une question à la fois (chacune peut être passée) :

1. L'adresse https de votre site. Il lit cette page pour proposer vos couleurs, vos polices et l'adresse de votre logo.
2. Votre validation ou vos changements sur cette palette. Rien n'est écrit avant votre accord.
3. Les noms de vos agents (le nom du juge est verrouillé).
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

## Étendre : courrier et devis

Le plugin ne contient aucun code qui envoie quoi que ce soit. Pour lire du courrier ou préparer des devis, vous copiez un modèle de `examples/` et vous branchez votre propre système (un serveur MCP de messagerie, un script ou une API) :

- `examples/agents/courrier.md` : lit et résume des messages, prépare des brouillons de réponse, n'envoie jamais.
- `examples/agents/devis.md` : prépare un brouillon de devis à partir de votre grille de prix ; les montants viennent de votre propre script, jamais d'une estimation du modèle.
- `examples/grille-prix.exemple.json` : une grille de prix fictive. Remplacez-la par la vôtre.
- `examples/calculer-devis.exemple.js` : un exemple de script de calcul, sans accès réseau.

Le guide `docs/ETENDRE.md` explique comment brancher un système, ajouter un agent et quelles règles de sécurité conserver. Le tableau de bord de l'auteur inclut un module courrier qui ouvre des connexions réseau. Il ne fait pas partie de ce plugin.

## Sécurité et vie privée

Les hooks du plugin n'ouvrent aucune connexion réseau et n'ont aucune dépendance externe.

Lu : l'événement envoyé par Claude Code au hook ; le début (64 Ko) et la fin (512 Ko) du journal local de la conversation, pour la durée et la taille du contexte ; `kinan.config.json` ; l'existence et la date de `.claude/relais.md` (pas son contenu).

Ajouté au contexte du modèle : la composition de l'équipe (début de conversation), l'avis de point de reprise, le rappel de relais. Les textes issus de la configuration sont nettoyés (une ligne, sans chevrons ni accents graves, longueur bornée).

Écrit dans `~/.kinan-os/` : `state.json`, `state.lock` (temporaire), `historique.jsonl`, `taches.json`, `sessions.json` (nom et chemin du projet, chemin du journal), `agents-ids.json`, `rappels.json`. Le texte de vos messages n'est jamais enregistré ; les descriptions de mission écrites par le juge le sont. Ces fichiers ne sont pas chiffrés et ne sont pas supprimés à la désinstallation.

Écrit dans le projet, à votre demande : `.claude/relais.md`, `PROJET.md`.

Jamais envoyé : rien ne quitte votre machine par les hooks. Le didacticiel lit la seule page que vous indiquez, par l'outil de lecture web de Claude Code. Pour signaler une vulnérabilité, voir `SECURITY.md`.

### Tableau de bord (option, testé sous Windows)

Une application Electron affiche l'état des agents et des conversations à partir des fichiers de `~/.kinan-os/` et applique `theme`. C'est une option séparée, non incluse dans ce plugin, testée uniquement sous Windows. En plus des fichiers ci-dessus, elle lit la fin des journaux récents de Claude Code (`~/.claude/projects`) pour le rappel de relais et l'alerte TOKEN OUT. La version de l'auteur contient aussi un module de veille de sites et un module de courrier qui ouvrent, eux, des connexions réseau ; une édition publique du tableau de bord sera livrée sans ces modules, et tant qu'elle n'est pas publiée et auditée, ne supposez pas que le tableau de bord fonctionne hors ligne.

### Limites générales

- Les agents suivent des consignes écrites : leur respect n'est pas garanti.
- Hooks testés par événements simulés ; comportement sous macOS et Linux non testé.
- Les règles propres à votre projet vont dans votre `CLAUDE.md` ou `PROJET.md`, pas dans le plugin.
- Installation chez un tiers : non testée tant que ce n'est pas fait.

## Contribuer

Ouvrez un ticket avant un changement important (nouvel agent par défaut, nouvel événement de hook, changement du schéma de configuration). Un changement par demande de fusion, avec une ligne dans `CHANGELOG.md`. Détails, dont les contrôles à lancer : `CONTRIBUTING.md`. Conduite : `CODE_OF_CONDUCT.md`. Tenez `README.md` et `README.fr.md` à jour ensemble.

## Licence

Apache License 2.0, copyright Studio Obsidienne. Voir `LICENSE` et `NOTICE`. La licence n'accorde aucun droit sur les noms ou marques du projet.

## Pistes d'amélioration
Les pistes d'amélioration futures (aucune n'est encore en place) sont dans [ROADMAP.fr.md](ROADMAP.fr.md) : fondations et tests, benchmark reproductible des économies, routage et vérification plus fiables, puis le tableau de bord comme produit. Aucun chiffre n'est annoncé tant qu'il n'est pas mesuré.
