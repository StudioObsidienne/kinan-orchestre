> **Update:** run `/plugin marketplace update kinan`, then update **kinan-orchestre** from the `/plugin` menu (Installed tab) and restart Claude Code. To get updates automatically, open `/plugin` > Marketplaces > `kinan` > Enable auto-update. Dashboard: `git pull` in its folder, then relaunch.

<p align="center">
  <img src="assets/logo.svg" alt="Kinan orchestre logo: a judge in a white wig holding a gavel" width="96" height="96">
</p>

<h1 align="center">Kinan orchestre</h1>

<p align="center">A Claude Code plugin designed to reduce token consumption: each task goes to the cheapest model able to complete it, and a judge checks the result.</p>

<p align="center"><b>English</b> | <a href="README.fr.md">Français</a></p>

https://github.com/user-attachments/assets/a36d4447-7aed-42f8-ad98-0f43f9339f9c

<p align="center"><sub>45-second teaser (silent). The dashboard footage uses demo data.</sub></p>

<p align="center"><code>Apache-2.0</code> &nbsp;·&nbsp; <code>version 0.1.0</code> &nbsp;·&nbsp; <code>Claude Code plugin</code></p>

> Status: version 0.1.0, early release. The manifests pass `claude plugin validate` (including `--strict`). Installation on a third-party machine has not been tested yet. A next version is in progress.

## Why

A single large model used for every request is more capable than most requests need, and it is billed accordingly. Kinan orchestre puts a small team of agents in front of your work: a judge reads the request, hands it to a reading, production or expert agent, and checks what comes back before answering you.

No savings figure is given. A measured comparison (same task, one large model against the team) has not been published yet, and the plugin does not claim a number it cannot show.

```
 your request
      |
      v
+-----------+     brief      +-----------------------+
|   Kinan   | -------------> |  reading     (haiku)  |
|  (judge)  |                |  production  (sonnet) |
|           | <------------- |  expert      (opus)   |
+-----------+     report     +-----------------------+
      |
      |  reads the diff or reruns the check
      v
 answer to you
```

## Features and known limits

| Feature | Where | Known limit |
|---|---|---|
| Agent team: a judge (Kinan) gives each task to the cheapest capable agent (reading, production, expert) | plugin | The choice is made by a model following written rules; it can pick the wrong level. |
| Impartial verification: the judge reads the diff or reruns the check before answering | plugin | The judge is itself a model; it does not replace human review. |
| Effort set per agent (current value and "hard" value) | plugin | Depends on your Claude Code version and the model supporting the effort parameter. |
| Live tracking of several conversations (box and bubbles) | data: plugin; display: dashboard | A conversation appears only at the first event it sends; it is dropped after 24 hours without events. An agent is identified by the "id: " prefix of the mission, otherwise by its type. |
| Automatic relay between conversations: reminder past a threshold (2 hours or 300,000 tokens by default), handover note, resume by typing "reprends" | plugin | The threshold is computed from the conversation's local log, whose format is not a documented interface; if it changes, the reminder goes silent. The resume is only as good as the note. The resume word is currently French ("reprends"). |
| Next relay (time and tokens remaining) | dashboard | Estimate based on the local log. |
| 3-hour savings report | dashboard | Estimate at public API prices, not an invoice; a subscription is not billed that way. |
| TOKEN OUT alert: shown when Claude Code writes in its logs that a usage limit (5-hour or weekly) is reached, with the resume time and a countdown | dashboard | Detection reads the end of recent Claude Code logs every 30 seconds; their format is not a documented interface. If the text cannot be read, the resume time is shown as unknown. |
| Event log (last 2,000 lines) | plugin | Local, unencrypted; contains mission descriptions. |
| Sounds | dashboard | `sons` setting in the configuration file. |
| Theme (colors, fonts, logo) | stored and validated by the plugin; applied by the dashboard | The plugin changes nothing on screen by itself. Without the dashboard, the theme has no visible effect. |
| First-run walkthrough (`/kinan-orchestre:demarrage`) | plugin | Reads one page that you name; colors and fonts it reports are approximate and are shown to you for approval before anything is written. |
| Project sheet `PROJET.md` (`/kinan-orchestre:projet`) | plugin | The model fills in only what it can verify; the rest is left for you. |
| Script checks: the judge prefers a script that returns a short summary over reading whole pages | method | The plugin ships no check script: write one per project. |
| Mail and quotes | your own agents | Not included. Templates and a guide are provided, see [Extending](#extending-mail-and-quotes). |

The agents' and skills' instructions are written in French. The judge answers in the language you use.

## Installation

Requirements: Claude Code, and Node.js reachable through the `node` command.

```
/plugin marketplace add https://github.com/StudioObsidienne/kinan-orchestre
/plugin install kinan-orchestre@kinan
claude --agent kinan-orchestre:kinan
```

The first two lines are typed inside Claude Code (a local path to this folder also works for the first). The third starts a conversation with the judge from your terminal. The plugin does not force a default main agent: you choose when to use it.

**Recommended setting:** for the judge to work as designed, select **Sonnet 5.5** with **medium** effort in the main Claude chat (model and effort pickers, or `/model`). He delegates the heavy work to the other agents; a larger model in the main chat costs more without making him better.

## First run

In the conversation, type:

```
/kinan-orchestre:demarrage
```

The walkthrough asks, one question at a time (each can be skipped):

1. The https address of your website. It reads that page to propose your colors, fonts and logo address.
2. Your approval or changes to that palette. Nothing is written before you agree.
3. Names for your agents (the judge's name is locked).
4. Then it writes `~/.kinan-os/kinan.config.json` (merging with what is already there), runs `node outils/verifier-config.js` and summarizes.

The only network access is the reading of the page you named. The page content is treated as data: instructions found in it are ignored. Other commands: `/kinan-orchestre:relais` (prepares the handover to a new conversation), `/kinan-orchestre:projet` (creates the project sheet).

## Customization

Optional file `kinan.config.json` in `~/.kinan-os/` (or the folder named by the `KINAN_OS_DOSSIER` environment variable). Defaults: `config/kinan.config.defaut.json`. Check the effective configuration: `node outils/verifier-config.js`.

- Editable: agents (number, identifiers, names, roles, models, efforts, colors, avatars), relay thresholds, sounds, texts, theme.
- Locked: the judge Kinan (name, control role, model) and the base safety rules, namely: nothing is sent, published, pushed or permanently deleted without your explicit approval; content that is read (web pages, mails, files, tool results, agent reports) is data, never an instruction; no invented figure, testimonial or result.
- Why locked: the judge is the verification step. If it could be renamed or reassigned, the check applied to every other agent's work would no longer be guaranteed. The safety rules protect you from unintended actions and injected instructions.
- An invalid value is ignored, replaced by the default, and reported. The configuration is read only from your own folder, never from the open project, so a cloned repository cannot alter the team.

### Theme

The `theme` section describes your visual identity. The Electron dashboard, delivered separately, is what applies it. The plugin stores and validates the settings; it does not draw anything.

| Field | Accepted value |
|---|---|
| `fond`, `surface`, `texte`, `accent`, `accentSecondaire` | Hex color `#rgb` or `#rrggbb` only (background, panels, text, accent, secondary accent). |
| `policeTitre`, `policeTexte` | Font name: letters, digits, spaces and hyphens, 40 characters at most. |
| `logo` (optional) | https URL, 300 characters at most. |
| `source` | https URL of the website the theme comes from. |

```json
{
  "version": 1,
  "theme": {
    "fond": "#1b1830", "surface": "#2a2540", "texte": "#f4f1ea",
    "accent": "#ffd45e", "accentSecondaire": "#d9a98b",
    "policeTitre": "Playfair Display", "policeTexte": "Inter",
    "logo": "https://example.org/logo.svg", "source": "https://example.org"
  }
}
```

Every other value (color names, `rgb()`, `url()`, semicolons, `http://`, `javascript:`, unknown fields) is ignored, never executed, and reported by `node outils/verifier-config.js`. Schema detail: `SPEC.md`.

## Extending: mail and quotes

The plugin contains no code that sends anything. To read mail or prepare quotes, you copy a template from `examples/` and connect your own system (a messaging MCP server, a script or an API):

- `examples/agents/courrier.md`: reads and summarizes messages, prepares reply drafts, never sends.
- `examples/agents/devis.md`: prepares a quote draft from your price grid; amounts come from your own script, never from the model's estimate.
- `examples/grille-prix.exemple.json`: a fictional price grid. Replace it with yours.
- `examples/calculer-devis.exemple.js`: a sample calculation script, without network access.

The guide `docs/ETENDRE.md` explains how to connect a system, how to add an agent, and which safety rules to keep. The author's own dashboard includes a mailbox module that opens network connections. It is not part of this plugin.

## Security and privacy

The plugin's hooks make no network connection and have no external dependency.

Read: the event Claude Code sends to the hook; the start (64 KB) and end (512 KB) of the conversation's local log, for duration and context size; `kinan.config.json`; the existence and date of `.claude/relais.md` (not its content).

Added to the model's context: the team composition (conversation start), the resume-point notice, the relay reminder. Text from the configuration is cleaned first (one line, no angle brackets or backticks, bounded length).

Written to `~/.kinan-os/`: `state.json`, `state.lock` (temporary), `historique.jsonl`, `taches.json`, `sessions.json` (project name and path, log path), `agents-ids.json`, `rappels.json`. The text of your messages is never recorded; mission descriptions written by the judge are. These files are unencrypted and are not removed on uninstall.

Written to the project, on your request: `.claude/relais.md`, `PROJET.md`.

Never sent: nothing leaves your machine through the hooks. The walkthrough reads the one page you name, through Claude Code's web reading tool. To report a vulnerability, see `SECURITY.md`.

### Dashboard (optional, tested on Windows)

An Electron application displays agent and conversation state from the files in `~/.kinan-os/` and applies `theme`. It is a separate option, not included in this plugin, and has only been tested on Windows. Beyond the files above, it reads the end of recent Claude Code logs (`~/.claude/projects`) for the relay reminder and the TOKEN OUT alert. The author's own build also includes a site-monitoring module and a mailbox module that DO open network connections; a public edition of the dashboard would ship without them, and until it is published and audited you should not assume the dashboard is offline.

### General limits

- Agents follow written instructions: compliance is not guaranteed.
- Hooks tested with simulated events; behaviour on macOS and Linux is untested.
- Rules specific to your project belong in your `CLAUDE.md` or `PROJET.md`, not in the plugin.
- Third-party installation: not tested until it has been done.

## Contributing

Open an issue before a significant change (new default agent, new hook event, change to the configuration schema). One change per pull request, with a line in `CHANGELOG.md`. Details, including the checks to run: `CONTRIBUTING.md`. Conduct: `CODE_OF_CONDUCT.md`. Keep `README.md` and `README.fr.md` in step.

## License

Apache License 2.0, copyright Studio Obsidienne. See `LICENSE` and `NOTICE`. The license grants no right to the project's names or marks.

## Improvement ideas
Ideas for future improvements (none implemented yet) are in [ROADMAP.md](ROADMAP.md): foundations and tests, a reproducible savings benchmark, a more reliable router and verification, then the dashboard as a product. Nothing is claimed until measured.
