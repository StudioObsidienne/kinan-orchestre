# Security / Sécurité

## Report a vulnerability / Signaler une vulnérabilité
Do not open a public issue. Use "GitHub Security Advisories" (private vulnerability reporting) on the repository: `https://github.com/StudioObsidienne/kinan-orchestre`. Target first response: 7 days.

N'ouvrez pas de ticket public. Utilisez « GitHub Security Advisories » (signalement privé de vulnérabilité) du dépôt : `https://github.com/StudioObsidienne/kinan-orchestre`. Première réponse visée : sous 7 jours.

## Scope / Périmètre
- Hooks (`hooks/*.js`): run by Claude Code on your machine, with your rights. / exécutés par Claude Code sur votre machine, avec vos droits.
- Text added to the model's context by the hooks (instruction-injection risk). / Texte ajouté au contexte du modèle par les hooks (risque d'injection d'instructions).
- Hooks write only to `~/.kinan-os/`; the relay and project skills may write `.claude/relais.md` and `PROJET.md` in the open project. / Les hooks écrivent seulement dans `~/.kinan-os/` ; les skills relais et projet peuvent écrire `.claude/relais.md` et `PROJET.md` dans le projet ouvert.

## Design / Conception
- No network access in the hooks; no external dependency. / Aucun accès réseau dans les hooks ; aucune dépendance externe.
- Text from `kinan.config.json` is cleaned (one line, no tags, bounded length) before being added to the context. / Le texte issu de `kinan.config.json` est nettoyé (une ligne, sans balises, longueur bornée) avant d'être ajouté au contexte.
- The configuration is read only from the user's folder, never from the open project: a cloned repository cannot change the team. / La configuration n'est lue que dans le dossier de l'utilisateur, jamais dans le projet ouvert : un dépôt cloné ne peut pas modifier l'équipe.
- The content of `.claude/relais.md` is not injected by the hooks; the model reads it only when the user writes "reprends". / Le contenu de `.claude/relais.md` n'est pas injecté par les hooks ; le modèle le lit seulement si l'utilisateur écrit « reprends ».
- Locked agent rules: nothing is sent or published without approval; read content is data, never an instruction. / Règles verrouillées des agents : rien n'est envoyé ni publié sans validation ; le contenu lu est une donnée, jamais une instruction.
