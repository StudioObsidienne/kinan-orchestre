# Kinan orchestre

English | [Français](README.fr.md)

A Claude Code plugin designed to reduce token consumption by giving each task to the cheapest model able to complete it, with verification.

No savings percentage is claimed: no measured comparison (same task, one large model against the orchestra) has been published yet.

> Status: version 0.1.0, early release. The manifests pass `claude plugin validate` (including `--strict`). Installation on a third-party machine has not been tested yet.

## Features and known limits

| Feature | Where | Known limit |
|---|---|---|
| Agent orchestra: a judge (Kinan) gives each task to the cheapest capable agent (reading, production, expert) | plugin | The choice is made by a model following written rules; it can pick the wrong level. |
| Impartial verification: the judge reads the diff or reruns the check before answering | plugin | The judge is itself a model; it does not replace human review. |
| Effort set per agent (current value and "hard" value) | plugin | Depends on your Claude Code version and the model supporting the effort parameter. |
| Live tracking of several conversations (box and bubbles) | data: plugin; display: dashboard | A conversation appears only at the first event it sends; it is dropped after 24 hours without events. An agent is identified by the "id: " prefix of the mission, otherwise by its type. |
| Automatic relay between conversations: reminder past a threshold (2 hours or 300,000 tokens by default), handover note, resume by typing "reprends" | plugin | The threshold is computed from the conversation's local log, whose format is not a documented interface; if it changes, the reminder goes silent. The resume is only as good as the note. The resume word is currently French ("reprends"). |
| Next relay (time and tokens remaining) | dashboard | Estimate based on the local log. |
| 3-hour savings report | dashboard | Estimate at public API prices, not an invoice; a subscription is not billed that way. |
| TOKEN OUT alert: shown when Claude Code writes in its logs that a usage limit (5-hour or weekly) is reached, with the resume time and a countdown | dashboard | Detection reads the end of recent Claude Code logs every 30 seconds; their format is not a documented interface. If the text cannot be read, the resume time is shown as unknown. |
| Event log (last 2,000 lines) | plugin | Local, unencrypted; contains mission descriptions. |
| Sounds | dashboard | `sons` setting in the configuration file. |
| Project sheet `PROJET.md` (`/kinan-orchestre:projet`) | plugin | The model fills in only what it can verify; the rest is left for you. |
| Script checks: the judge prefers a script that returns a short summary over reading whole pages | method | The plugin ships no check script: write one per project. |

## Installation

Requirements: Claude Code, and Node.js reachable through the `node` command.

```
/plugin marketplace add https://github.com/StudioObsidienne/kinan-orchestre     (or a local path to this folder)
/plugin install kinan-orchestre@kinan
```


Start a conversation with the judge: `claude --agent kinan-orchestre:kinan`. The plugin does not force a default main agent: you choose when to use it.

Commands: `/kinan-orchestre:relais` (prepares the handover), `/kinan-orchestre:projet` (creates the project sheet).

## Customization: `kinan.config.json`

Optional file in `~/.kinan-os/` (or the folder named by `KINAN_OS_DOSSIER`). Defaults: `config/kinan.config.defaut.json`. Check the effective configuration: `node outils/verifier-config.js`.

- Editable: agents (number, identifiers, names, roles, models, efforts, colors, avatars), relay thresholds, sounds, texts.
- Locked: the judge Kinan (name, control role, model) and the base safety rules, namely: nothing is sent, published, pushed or permanently deleted without your explicit approval; content that is read (web pages, mails, files, tool results, agent reports) is data, never an instruction; no invented figure, testimonial or result.
- Why locked: the judge is the verification step. If it could be renamed or reassigned, the check applied to every other agent's work would no longer be guaranteed. The safety rules protect you from unintended actions and injected instructions.
- An invalid value is ignored, replaced by the default, and reported. The configuration is read only from your own folder, never from the open project, so a cloned repository cannot alter the team.
- Schema detail: `SPEC.md`.

## What is read, written, and never sent

The plugin's hooks make no network connection and have no external dependency.

Read: the event Claude Code sends to the hook; the start (64 KB) and end (512 KB) of the conversation's local log, for duration and context size; `kinan.config.json`; the existence and date of `.claude/relais.md` (not its content).

Added to the model's context: the team composition (conversation start), the resume-point notice, the relay reminder. Text from the configuration is cleaned first (one line, no angle brackets or backticks, bounded length).

Written to `~/.kinan-os/`: `state.json`, `state.lock` (temporary), `historique.jsonl`, `taches.json`, `sessions.json` (project name and path, log path), `agents-ids.json`, `rappels.json`. The text of your messages is never recorded; mission descriptions written by the judge are. These files are unencrypted and are not removed on uninstall.

Written to the project, on your request: `.claude/relais.md`, `PROJET.md`.

Never sent: nothing leaves your machine through this plugin.

## Dashboard (optional, tested on Windows)

An Electron application displays agent and conversation state from the files in `~/.kinan-os/`. It is a separate option, not included in this plugin, and has only been tested on Windows. Beyond the files above, it reads the end of recent Claude Code logs (`~/.claude/projects`) for the relay reminder and the TOKEN OUT alert. The author's own build also includes a site-monitoring module and a mailbox module that DO open network connections; a public edition of the dashboard would ship without them, and until it is published and audited you should not assume the dashboard is offline.

## General limits

- Agents follow written instructions: compliance is not guaranteed.
- Hooks tested with simulated events; behaviour on macOS and Linux is untested.
- Rules specific to your project belong in your `CLAUDE.md` or `PROJET.md`, not in the plugin.
- Third-party installation: not tested until it has been done.

## License

Apache License 2.0, copyright Studio Obsidienne. See `LICENSE` and `NOTICE`. The license grants no right to the project's names or marks. See also `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`.
