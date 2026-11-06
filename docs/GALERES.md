# Galères connues et solutions

Les problèmes rencontrés en montant Kinan Orchestre, avec leur cause et leur solution. Chaque entrée vient du journal des changements, du code ou des notes du projet. [English version](GALERES.en.md)

## 1. Le plugin reste en 0.1.0 après une mise à jour

- **Cause** : le catalogue local du marketplace `kinan` est périmé (cache). Claude Code ne voit pas la nouvelle version.
- **Solution** : dans un terminal, `claude plugin marketplace update kinan`, puis `claude plugin update kinan-orchestre@kinan`, puis redémarrer Claude Code.
- **On apprend** : le plugin et son catalogue se mettent à jour séparément. Rafraîchir le catalogue d'abord, le plugin ensuite. Le tableau de bord, lui, se met à jour avec `git pull`.

## 2. L'épinglage à la barre des tâches Windows ouvre l'écran d'accueil d'Electron

- **Cause** : à l'épinglage, Windows relance « electron.exe » sans savoir quelle appli ni quelle icône utiliser.
- **Solution** : le tableau de bord déclare son identité à Windows (`setAppDetails` : identifiant d'appli, icône `icon.ico`, commande de relance). L'icône est dessinée en plusieurs tailles (16 à 256 px) pour rester nette dans la barre.
- **On apprend** : sous Windows, une appli épinglée doit fournir sa propre commande de relance et son icône.

## 3. La version du plugin ne s'affiche pas dans le tableau de bord

- **Cause** : le tableau de bord la lit dans `plugin.json` des dossiers indiqués, puis dans `installed_plugins.json` de Claude Code. Si le plugin n'est pas installé sur la machine, ce fichier n'existe pas : rien à lire.
- **Solution** : rien à corriger, c'est normal. Installer le plugin via `/plugin` fait apparaître la version.
- **On apprend** : une information absente n'est pas toujours un bogue. Vérifier d'abord que la source de l'information existe.

## 4. Un fichier d'état corrompu bloque tout

- **Symptôme** : après un `state.json`, `taches.json`, `sessions.json`, `agents-ids.json` ou `rappels.json` corrompu (par exemple contenant `null`), les événements suivants échouaient.
- **Cause** : les hooks supposaient un fichier toujours valide.
- **Solution** (corrigée dans le plugin) : lecture tolérante, réparation du fichier au premier événement, écriture atomique sous verrou.
- **On apprend** : tout fichier lu par plusieurs programmes peut être illisible un jour. Lire avec tolérance, écrire d'un seul bloc.

## 5. Un agent reste « au travail » alors qu'il ne répond plus

- **Cause** : un agent interrompu n'envoie jamais son événement de fin.
- **Solution** (corrigée dans le plugin) : sans nouvelle depuis 1 h, l'agent repasse au repos au prochain événement.
- **On apprend** : un état « en cours » doit toujours avoir une date limite.

## 6. Une mission reste « en cours » pour toujours

- **Cause** : une tâche jamais terminée captait l'identifiant et la fin d'un nouvel agent.
- **Solution** (corrigée dans le plugin) : après 4 h, la mission repasse « à faire » (champ `interrompue`). Une tâche saisie dans le tableau de bord n'est plus liée à un agent.
- **On apprend** : même règle que pour l'agent muet, et une tâche ajoutée directement dans l'appli ne doit pas être confondue avec le travail d'un agent.

## 7. Deux agents modifient le même fichier

- **Cause** : sans règle, deux agents (ou deux conversations) peuvent écraser le travail l'un de l'autre.
- **Solution** : le hook `hooks/verrou-fichiers.js` réserve un fichier à l'agent qui l'a modifié, jusqu'à la fin de cet agent ou 10 minutes sans modification. Le juge ne lance jamais deux agents en parallèle sur les mêmes fichiers.
- **On apprend** : répartir les fichiers entre agents avant de lancer le travail, le verrou n'est que le filet de sécurité.

## 8. Commandes réécrites dans le shell de l'outil Bash

- **Symptôme** : sous Windows (Git Bash ou PowerShell), `nul` et `\r` sont altérés dans les commandes envoyées.
- **Cause** : le shell de l'outil Bash réécrit certaines commandes avant de les exécuter.
- **Solution** : écrire les fichiers avec un petit script Python (`chr(92)` pour la barre oblique inverse) ou utiliser les outils d'édition de fichiers.
- **On apprend** : ne pas faire passer de `nul` ni de `\r` par la ligne de commande ; passer par un fichier.

## 9. `gh` (GitHub CLI) absent : pas de release en ligne de commande

- **Symptôme** : impossible de créer les releases depuis le terminal.
- **Cause** : `gh` n'est pas installé.
- **Solution** : publier la release depuis la page web du dépôt (Releases > Draft a new release). Le tag git existe déjà après le push.
- **On apprend** : le tag suffit à préparer la release ; sa publication se fait sur la page web.

---

Fiche courte : seules les galères documentées dans le journal des changements, le code et les notes du projet y figurent. D'autres pourront s'y ajouter.
