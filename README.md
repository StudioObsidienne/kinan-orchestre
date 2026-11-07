> **Update:** run `/plugin marketplace update kinan`, then update **kinan-orchestre** from the `/plugin` menu (Installed tab) and restart Claude Code. To get updates automatically, open `/plugin` > Marketplaces > `kinan` > Enable auto-update. Dashboard: `git pull` in its folder, then relaunch.

<p align="center">
  <img src="assets/logo.svg" alt="Kinan orchestre logo: a judge in a white wig holding a gavel" width="96" height="96">
</p>

<h1 align="center">Kinan orchestre</h1>

<p align="center">A Claude Code plugin designed to reduce token consumption: each task goes to the cheapest model able to complete it, and a judge checks the result.</p>

<p align="center"><b>English</b> | <a href="README.fr.md">Français</a> | <a href="https://kinan-orchestre-site.vercel.app/">Website</a></p>

https://github.com/user-attachments/assets/a978db97-4729-49fc-891f-31bbd257a1eb

<p align="center"><sub>95-second teaser, no voice, with quiet sound effects (turn the sound on). The dashboard footage uses demo data.</sub></p>

<p align="center"><code>Apache-2.0</code> &nbsp;·&nbsp; <code>version 0.3.0</code> &nbsp;·&nbsp; <code>Claude Code plugin</code></p>

> Status: version 0.3.0, early release. The manifests pass `claude plugin validate` (including `--strict`). Tested on Windows on testers' own computers, first feedback already integrated. A next version is in progress.

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
| File lock between agents (`KINAN_VERROU`): a file being edited by one agent is reserved; a second agent is refused, or only warned with `KINAN_VERROU=avertir` (see "Security and privacy") | plugin | Edits made through Bash are not seen. The reservation expires after 10 minutes without a change. On any error, nothing is refused. |
| File reservation: a project file being modified by an agent is reserved for it; another agent (or another conversation) that tries to modify it is refused and told to report the conflict | plugin (`hooks/verrou-fichiers.js`) | Covers Edit, Write, MultiEdit and NotebookEdit, not files changed through Bash. Two subagents of the same conversation are told apart only when Claude Code gives the hook their `agent_id`. A reservation ends with the agent, or after 10 minutes without a new modification. On any error, nothing is refused. |
| Sounds | dashboard | `sons` setting in the configuration file. |
| Theme (colors, fonts, logo) | stored and validated by the plugin; applied by the dashboard | The plugin changes nothing on screen by itself. Without the dashboard, the theme has no visible effect. |
| First-run walkthrough (`/kinan-orchestre:demarrage`) | plugin | Reads one page that you name; colors and fonts it reports are approximate and are shown to you for approval before anything is written. |
| Project sheet `PROJET.md` (`/kinan-orchestre:projet`) | plugin | The model fills in only what it can verify; the rest is left for you. |
| Script checks: the judge prefers a script that returns a short summary over reading whole pages | method | The plugin ships no check script: write one per project. |
| Mail and quotes: summary of new mails (one line per point), reply drafts, quote drafts from your own price grid | agents `courrier` (Haiku) and `devis` (Sonnet): plugin; mailbox, validation and sending: dashboard Mail tab, optional and disabled by default | The agents only read (Read, Glob, Grep) and answer with a JSON block that the dashboard checks. Amounts are computed by the dashboard from your grid, never by the model. Nothing is sent without your validation and a system confirmation. See [Mail and quotes](#mail-and-quotes). |

The agents' and skills' instructions are written in French. The judge answers in the language you use.

Version numbers: the plugin and the kinan-dashboard app are two separate things with their own version numbers (for example plugin 0.2.2, dashboard 0.3.1). The dashboard shows both ("Dashboard" and "Plugin"). Updating one does not update the other: the plugin is updated in Claude Code, the dashboard with `git pull`.

## Installation

Requirements: Claude Code, and Node.js reachable through the `node` command.

```
/plugin marketplace add https://github.com/StudioObsidienne/kinan-orchestre
/plugin install kinan-orchestre@kinan
claude --agent kinan-orchestre:kinan
```

The first two lines are typed inside Claude Code (a local path to this folder also works for the first). The third starts a conversation with the judge from your terminal. The plugin does not force a default main agent: you choose when to use it.

**Recommended setting:** for the judge to work as designed, select **Sonnet 5.5** with **medium** effort in the main Claude chat (model and effort pickers, or `/model`). He delegates the heavy work to the other agents; a larger model in the main chat costs more without making him better.

### Install the dashboard too (recommended)

The plugin only writes state files. The **dashboard** displays them: agents, conversations, tokens, next relay, usage-limit alert and your theme. Without it you get no screen and the theme has no visible effect. For a complete, working setup, install both:

```
git clone https://github.com/StudioObsidienne/kinan-dashboard.git
cd kinan-dashboard
npm install
npm start
```

Requirements: Node.js 20 or later and npm. On Windows, `lancer-kinan-os.cmd` in that folder runs the same steps. Details and limits: [kinan-dashboard](https://github.com/StudioObsidienne/kinan-dashboard).

## First run

In the conversation, type:

```
/kinan-orchestre:demarrage
```

The walkthrough asks, one question at a time (each can be skipped):

1. Names for your agents, asked first (the judge's name is locked).
2. The https address of your website. It reads that page to propose your colors, fonts and logo address.
3. Your approval or changes to that palette. Nothing is written before you agree.
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

## Mail and quotes

The plugin contains no code that connects to a mailbox or sends anything. It ships two agents that the dashboard's Mail tab launches in the background (`claude -p --agent kinan-orchestre:courrier`, then `kinan-orchestre:devis`):

- `agents/courrier.md` (Haiku): reads the mails the dashboard fetched, summarizes them (the summary is one line per point), flags quote requests and suspicious mails, proposes reply drafts.
- `agents/devis.md` (Sonnet): picks lines and quantities from your price grid for each quote request. It gives no price: the dashboard computes each amount, the VAT and the total from your grid.

Both are limited to Read, Glob and Grep, read only the files the dashboard names in its message, and answer with a JSON block. The dashboard validates that block and writes the drafts itself; it recomputes the recipient from the original mail, and a mail is marked as processed only if the agent actually listed it. Mail content is treated as data, never as instructions.

### Connect your mailbox (dashboard, Mail tab)

1. Install the dashboard (see above), open Gestion, then the **Courrier** (Mail) tab, and click **Activer le courrier** (enable). Until then, the dashboard opens no mail connection.
2. Choose your provider, enter your address and an app password, click **Enregistrer** (save) then **Tester la connexion** (test). The password is encrypted by the operating system and never shown again.
3. **Relever** fetches new mails (read-only), **Récap mails** runs the `courrier` agent, **Préparer les devis** runs the `devis` agent. Validate the drafts, then **Envoyer**: a system dialog lists the recipients before anything is sent.

| Provider | Password to use | Before connecting |
|---|---|---|
| Zoho Mail (zoho.eu or zoho.com) | An app-specific password (Zoho account, Security, App passwords) | Enable IMAP (Zoho Mail settings, Mail, IMAP access) and choose your account's region. |
| Gmail / Google Workspace | An app password (Google Account, Security; 2-Step Verification required). Your usual password is refused. | Check that IMAP is enabled (Settings, See all settings, Forwarding and POP/IMAP). A Workspace administrator can block IMAP or app passwords. |
| Outlook.com / Microsoft 365 | An app password, if your account offers one | Microsoft increasingly requires modern authentication (OAuth), which this version does not support: the connection may be refused. On Microsoft 365, your administrator must allow IMAP and authenticated SMTP (SMTP AUTH). |
| OVHcloud (MX Plan) | The mailbox password set in the OVHcloud control panel | IMAP is on by default. For Email Pro or Exchange, choose "Autre" (Other) with the servers shown in your control panel. |
| iCloud Mail | An app-specific password (Apple Account, Sign-In and Security; two-factor authentication required) | If login fails, enter the part of the address before the @ as the login. |
| Other | What your provider documents for IMAP and SMTP | Enter the IMAP and SMTP host, port and security (SSL/TLS or STARTTLS). A host name is required (no IP address, no localhost); unencrypted connections are not offered. |

Quotes need your own price grid: copy `examples/grille-prix.exemple.json` (fictional) to `grille-prix.json` in the dashboard's `echange` folder and replace its lines with your services and prices. Optional `mentions` lines (legal notices, payment terms) are printed at the bottom of the PDF.

### Connecting another system

`examples/` keeps templates for a different setup (a messaging MCP server, a script or an API): `examples/agents/courrier.md`, `examples/agents/devis.md`, `examples/calculer-devis.exemple.js`. The guide `docs/ETENDRE.md` explains how to connect a system, how to add an agent, and which safety rules to keep.

## Agent permissions

| Agent | Default model | Allowed tools | Notes |
|---|---|---|---|
| `kinan` (judge) | sonnet | All tools of the session (no `tools` field) | Delegates, reads diffs, reruns checks, does small tasks itself. Bound by the locked safety rules. |
| `lecture` | haiku | Read, Grep, Glob, Bash, WebFetch, WebSearch | Described as read-only, but Bash can modify files: read-only is an instruction here, not enforced. |
| `production` | sonnet | All tools of the session | Writes files. |
| `expert` | opus | All tools of the session | Writes files. |
| `courrier` | haiku | Read, Grep, Glob | Read-only enforced: no shell, no network, no write. |
| `devis` | sonnet | Read, Grep, Glob | Read-only enforced: no shell, no network, no write. |

"All tools of the session" means what your Claude Code session allows, under your own permission settings (`/permissions`, permission mode): the plugin grants nothing beyond that. An agent added in `kinan.config.json` uses one of these definitions (`base`) or an agent type you name, and gets that definition's tools. `tests/manifestes.test.js` fails if a definition's tools change while this table is not updated.

## Security and privacy

The plugin's hooks make no network connection and have no external dependency. One hook can refuse a tool call: `verrou-fichiers.js` refuses an edit of a file reserved by another active agent; on any error it refuses nothing.

By default the lock refuses the write. With the environment variable `KINAN_VERROU=avertir`, the write is allowed and the agent only receives a warning.

```bash
# macOS / Linux (current session)
export KINAN_VERROU=avertir
```

```powershell
# Windows PowerShell (current session)
$env:KINAN_VERROU='avertir'
# Windows, permanent (applies to newly opened terminals)
setx KINAN_VERROU avertir
```

Read: the event Claude Code sends to the hook; the start (64 KB) and end (512 KB) of the conversation's local log, for duration and context size; `kinan.config.json`; the existence and date of `.claude/relais.md` (not its content).

Added to the model's context: the team composition (conversation start), the resume-point notice, the relay reminder. Text from the configuration is cleaned first (one line, no angle brackets or backticks, bounded length).

Written to `~/.kinan-os/`: `state.json` (mirror of the latest active conversation), `sessions/<id>.json` (state of each conversation, removed when it ends or after 24 h without activity), `state.lock` (temporary), `historique.jsonl`, `taches.json`, `sessions.json` (project name and path, log path), `agents-ids.json`, `rappels.json`, `fichiers-verrous.json` (paths of the files being modified by an agent, kept 10 minutes at most), `fichiers.lock` and `rappels.lock` (temporary). The text of your messages is never recorded; mission descriptions written by the judge are. These files are unencrypted and are not removed on uninstall.

Written to the project, on your request: `.claude/relais.md`, `PROJET.md`.

Never sent: nothing leaves your machine through the hooks. The walkthrough reads the one page you name, through Claude Code's web reading tool. To report a vulnerability, see `SECURITY.md`.

### Dashboard (recommended, tested on Windows)

An Electron application displays agent and conversation state from the files in `~/.kinan-os/` and applies `theme`. It is a separate repository, [kinan-dashboard](https://github.com/StudioObsidienne/kinan-dashboard), not included in this plugin; install it for a complete setup. It has only been tested on Windows. Beyond the files above, it reads the end of recent Claude Code logs (`~/.claude/projects`) for the relay reminder and the TOKEN OUT alert. By default it opens no network connection. Two options open some, only once you enable them: the update check (`raw.githubusercontent.com`) and the Mail tab (the IMAP and SMTP servers of the mailbox you choose, plus `claude -p` for the summaries, which uses your Claude account like any Claude Code session). `npm run verifier` in the dashboard folder checks these rules statically; the dashboard's README lists every connection and every file it reads and writes.

### General limits

- Agents follow written instructions: compliance is not guaranteed.
- Hooks covered by automated tests with simulated events (`node --test tests/`: normal flow, errors and corrupted files, concurrency); run on Windows only, behaviour on macOS and Linux is untested.
- Rules specific to your project belong in your `CLAUDE.md` or `PROJET.md`, not in the plugin.
- Third-party installation: not tested until it has been done.

## Help and token savings

- [Known problems and fixes](docs/GALERES.en.md): what went wrong during setup and how to fix it.
- [Master prompt](docs/PROMPT-MASTER.en.md): a ready-to-paste prompt that makes your assistant follow Kinan's settings on every request, to cut token use.

## Contributing

Open an issue before a significant change (new default agent, new hook event, change to the configuration schema). One change per pull request, with a line in `CHANGELOG.md`. Details, including the checks to run: `CONTRIBUTING.md`. Conduct: `CODE_OF_CONDUCT.md`. Keep `README.md` and `README.fr.md` in step.

## License

Apache License 2.0, copyright Studio Obsidienne. See `LICENSE` and `NOTICE`. The license grants no right to the project's names or marks.

## Improvement ideas
Improvement ideas are in [ROADMAP.md](ROADMAP.md). Phase 1 is partly done (automated tests, failure handling, concurrency, permissions); the outside install test and the public demo are still to do. The rest is not implemented yet: foundations and tests, a reproducible savings benchmark, a more reliable router and verification, then the dashboard as a product. Nothing is claimed until measured.
