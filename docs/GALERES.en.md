# Known snags and fixes

Problems met while building Kinan Orchestre, with cause and fix. Every entry comes from the changelog, the code or the project notes. [Version française](GALERES.md)

## 1. The plugin stays at 0.1.0 after an update

- **Cause**: the local catalogue of the `kinan` marketplace is stale (cache). Claude Code does not see the new version.
- **Fix**: in a terminal, run `claude plugin marketplace update kinan`, then `claude plugin update kinan-orchestre@kinan`, then restart Claude Code.
- **Lesson**: the plugin and its catalogue update separately. Refresh the catalogue first, then the plugin. The dashboard is updated with `git pull`.

## 2. Pinning to the Windows taskbar opens Electron's welcome screen

- **Cause**: when pinned, Windows relaunches "electron.exe" without knowing which app or icon to use.
- **Fix**: the dashboard declares its identity to Windows (`setAppDetails`: app id, `icon.ico`, relaunch command). The icon is drawn at several sizes (16 to 256 px) so it stays sharp in the taskbar.
- **Lesson**: on Windows, a pinned app must provide its own relaunch command and icon.

## 3. The plugin version does not show in the dashboard

- **Cause**: the dashboard reads it from the `plugin.json` of the configured folders, then from Claude Code's `installed_plugins.json`. If the plugin is not installed on the machine, that file does not exist: nothing to read.
- **Fix**: nothing to fix, this is expected. Installing the plugin through `/plugin` makes the version appear.
- **Lesson**: a missing value is not always a bug. First check that the source of the information exists.

## 4. A corrupted state file blocks everything

- **Symptom**: after a `state.json`, `taches.json`, `sessions.json`, `agents-ids.json` or `rappels.json` became corrupted (for example containing `null`), the following events failed.
- **Cause**: the hooks assumed the file was always valid.
- **Fix** (fixed in the plugin): tolerant reading, file repaired at the first event, atomic writes under a lock.
- **Lesson**: any file read by several programs can be unreadable one day. Read tolerantly, write in a single step.

## 5. An agent stays "working" but no longer answers

- **Cause**: an interrupted agent never sends its end event.
- **Fix** (fixed in the plugin): with no news for 1 h, the agent returns to idle at the next event.
- **Lesson**: an "in progress" state must always have a deadline.

## 6. A mission stays "in progress" forever

- **Cause**: a task that never finished captured the identifier and the end of a new agent.
- **Fix** (fixed in the plugin): after 4 h the mission goes back to "to do" (`interrompue` field). A task entered in the dashboard is no longer linked to an agent.
- **Lesson**: same rule as the silent agent, and a task typed into the app must not be mistaken for an agent's work.

## 7. Two agents edit the same file

- **Cause**: with no rule, two agents (or two conversations) can overwrite each other's work.
- **Fix**: the `hooks/verrou-fichiers.js` hook reserves a file for the agent that modified it, until that agent ends or 10 minutes pass without modification. The judge never launches two agents in parallel on the same files.
- **Lesson**: split files between agents before starting; the lock is only the safety net.

---

Short sheet: only snags documented in the changelog, the code and the project notes are listed. More may be added.
