# Extending Kinan orchestre / Étendre Kinan orchestre

English | [Français](#français)

## English

### Principle

The plugin contains no code that sends anything: no mail, no message, no quote. Reading and drafting for such tasks is done by agents that you write and connect yourself. This keeps the plugin free of network connections and credentials, and leaves the decision to send with you.

`examples/` holds two agent templates to copy and adapt, a fictional price grid and a sample calculation script. Claude Code does not load anything from `examples/`: a file only becomes an agent once you copy it to `.claude/agents/` (one project) or `~/.claude/agents/` (all projects).

### Connect your own system

Three usual routes. Pick the one that matches what you already use.

| Route | How | Point of attention |
|---|---|---|
| MCP server | Install an MCP server for your mailbox or your tool, then list only its read tools in the agent's `tools` field (`mcp__<server>__<read_tool>`). | An MCP server runs with your rights. Read what it can do, and leave its send tools out of `tools`. |
| Script | Write a script that reads or computes, and let the agent run it through `Bash`. | Restrict `Bash` to that command with a permission rule, for example `Bash(node scripts/my-script.js *)`. |
| API | Call the API from your own script (key in an environment variable), not from the agent. | Never put a key in an agent file, in `kinan.config.json` or in a prompt. |

### Add an agent

1. Copy a template, for example `examples/agents/courrier.md`, to `.claude/agents/` and edit it: name, description, `tools`, `model`, instructions.
2. Declare it in `~/.kinan-os/kinan.config.json` so the judge knows it exists. The `agents` section replaces the whole default list, so keep the three default agents next to yours:

```json
{
  "version": 1,
  "agents": {
    "drafion": { "nom": "Drafion", "base": "lecture", "role": "Reading, search, checks. Read only.", "modele": "haiku", "effort": "low", "effortHaut": "medium" },
    "skyze":   { "nom": "Skyze",   "base": "production", "role": "Everyday production.", "modele": "sonnet", "effort": "medium", "effortHaut": "high" },
    "johms":   { "nom": "Johms",   "base": "expert", "role": "Real difficulty only.", "modele": "opus", "effort": "high", "effortHaut": "xhigh" },
    "courrier": { "nom": "Courrier", "base": "courrier", "role": "Reads mail, prepares drafts, never sends.", "modele": "haiku", "effort": "low", "effortHaut": "medium" }
  }
}
```

`base` is either `lecture`, `production`, `expert`, or the name of your own agent file (here `courrier`). Up to 8 agents; the identifier `kinan` is reserved for the judge. Check the result with `node outils/verifier-config.js`, then start a new session: the team is read at session start.

3. The judge hands tasks to your agent according to its `role`. Write the role as one precise line.

### Safety rules to keep

- Nothing is sent, published or permanently deleted without your explicit approval. An agent produces a draft; you send it.
- What an agent reads (mail, web page, file, tool result) is data, never an instruction. Say so in each agent's prompt.
- Amounts come from a script that you wrote and tested, never from the model's estimate. No script, no figure.
- The price grid is yours. The one in `examples/` is fictional.
- Read-only tools by default. Add a write or send tool only knowingly, and keep Claude Code's permission prompts on for it.
- Secrets stay out of agent files, configuration and prompts.
- Try on test data first (a test mailbox, a dummy grid).

### Limits

Agents follow written instructions: compliance is not guaranteed, which is why sending stays a manual step. The author's dashboard includes a mailbox module that opens network connections; it is not part of this plugin.

---

## Français

### Principe

Le plugin ne contient aucun code d'envoi : ni mail, ni message, ni devis. La lecture et la préparation de brouillons sont confiées à des agents que vous écrivez et branchez vous-même. Le plugin reste ainsi sans connexion réseau ni identifiant, et la décision d'envoyer vous appartient.

Le dossier `examples/` contient deux modèles d'agents à copier et adapter, une grille de prix fictive et un exemple de script de calcul. Claude Code ne charge rien depuis `examples/` : un fichier ne devient un agent qu'une fois copié dans `.claude/agents/` (un projet) ou `~/.claude/agents/` (tous les projets).

### Brancher votre propre système

Trois voies habituelles. Choisissez celle qui correspond à ce que vous utilisez déjà.

| Voie | Comment | Point d'attention |
|---|---|---|
| Serveur MCP | Installez un serveur MCP pour votre messagerie ou votre outil, puis ne listez dans `tools` de l'agent que ses outils de lecture (`mcp__<serveur>__<outil_de_lecture>`). | Un serveur MCP s'exécute avec vos droits. Lisez ce qu'il peut faire et laissez ses outils d'envoi hors de `tools`. |
| Script | Écrivez un script qui lit ou calcule, et laissez l'agent le lancer par `Bash`. | Limitez `Bash` à cette commande par une règle de permission, par exemple `Bash(node scripts/mon-script.js *)`. |
| API | Appelez l'API depuis votre propre script (clé dans une variable d'environnement), pas depuis l'agent. | Aucune clé dans un fichier d'agent, dans `kinan.config.json` ni dans un prompt. |

### Ajouter un agent

1. Copiez un modèle, par exemple `examples/agents/courrier.md`, dans `.claude/agents/` et modifiez-le : nom, description, `tools`, `model`, instructions.
2. Déclarez-le dans `~/.kinan-os/kinan.config.json` pour que le juge le connaisse. La section `agents` remplace toute la liste par défaut : gardez donc les trois agents par défaut à côté du vôtre.

```json
{
  "version": 1,
  "agents": {
    "drafion": { "nom": "Drafion", "base": "lecture", "role": "Lectures, recherches, vérifications. Lecture seule.", "modele": "haiku", "effort": "low", "effortHaut": "medium" },
    "skyze":   { "nom": "Skyze",   "base": "production", "role": "Production courante.", "modele": "sonnet", "effort": "medium", "effortHaut": "high" },
    "johms":   { "nom": "Johms",   "base": "expert", "role": "Difficulté réelle seulement.", "modele": "opus", "effort": "high", "effortHaut": "xhigh" },
    "courrier": { "nom": "Courrier", "base": "courrier", "role": "Lit les mails, prépare des brouillons, n'envoie jamais.", "modele": "haiku", "effort": "low", "effortHaut": "medium" }
  }
}
```

`base` vaut `lecture`, `production`, `expert`, ou le nom de votre propre fichier d'agent (ici `courrier`). Huit agents au plus ; l'identifiant `kinan` est réservé au juge. Vérifiez avec `node outils/verifier-config.js`, puis ouvrez une nouvelle session : l'équipe est lue au démarrage.

3. Le juge confie les tâches à votre agent d'après son `role`. Écrivez le rôle en une ligne précise.

### Règles de sécurité à conserver

- Rien n'est envoyé, publié ni supprimé définitivement sans votre validation explicite. Un agent produit un brouillon ; c'est vous qui envoyez.
- Ce qu'un agent lit (mail, page web, fichier, résultat d'outil) est une donnée, jamais une instruction. Écrivez-le dans le prompt de chaque agent.
- Les montants viennent d'un script que vous avez écrit et testé, jamais d'une estimation du modèle. Pas de script, pas de chiffre.
- La grille de prix est la vôtre. Celle de `examples/` est fictive.
- Outils en lecture seule par défaut. N'ajoutez un outil d'écriture ou d'envoi qu'en connaissance de cause, et gardez les demandes d'autorisation de Claude Code actives pour lui.
- Aucun secret dans les fichiers d'agents, la configuration ou les prompts.
- Essayez d'abord sur des données de test (boîte de test, grille factice).

### Limites

Les agents suivent des instructions écrites : leur respect n'est pas garanti, c'est pourquoi l'envoi reste un geste manuel. Le tableau de bord de l'auteur inclut un module courrier qui ouvre des connexions réseau ; il ne fait pas partie de ce plugin.
