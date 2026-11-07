# Kinan Orchestre: improvement ideas

Ticked items are done. The others are improvement ideas, not features already in place. We will move step by step.

## Phase 1: consolidate the foundations
- [x] Install test on an outside machine (Windows: done by a tester; macOS and Linux still to do)
- [x] Automated tests (scripts, hooks, dashboard startup): `node --test tests/` in the plugin, `npm test` in the dashboard (includes a real Electron start-up)
- [x] Interruption and failure tests: silent agent, failing hook, corrupted config, stuck task (`tests/erreurs.test.js`); corrupted state files are now repaired instead of blocking later events
- [x] Concurrency: locking when two agents touch the same files (`hooks/verrou-fichiers.js`, `tests/concurrence.test.js`). Limits: edits made through Bash are not seen; subagents of one conversation are told apart only when Claude Code passes `agent_id`
- [x] Document each agent's permissions and allowed tools (README, "Agent permissions"; checked by `tests/manifestes.test.js`)
- [ ] Working public demo
- [x] Updates: explanation at the top of the README, version check in the dashboard (off by default)

## Phase 2: prove the value
External review taken into account (7 Nov 2026): Kinan's next big milestone is neither visual nor functional, it is scientific and technical. It must show that the orchestration brings a measurable advantage, that its mechanisms withstand errors and that results are reliable: moving from a demonstration that it works to a demonstration of performance and reliability. Three documents to write first:
- [ ] `KINAN_ARCHITECTURE.md`: how the two repositories interact, data flows, responsibilities and limits
- [ ] `KINAN_BENCHMARK.md`: reproducible comparison protocol, with results, costs, times and quality
- [ ] `KINAN_SECURITY.md`: permissions, local data, network access and protection mechanisms (one central document)
- Reproducible benchmark, Kinan vs a single model: input/output tokens, cost, time, call count, quality at equivalent result
- Three task sets (simple, intermediate, complex), each repeated several times
- Publish the results, including bad ones
- Until measured, no savings figure is claimed.

## Phase 3: improve the engine
- More reliable routing: task score (complexity, ambiguity, risk, context size, tool needs)
- Adaptive escalation Haiku, Sonnet, Opus, with rules per task type
- Multi-level verification: structure, tests/lint/types, semantic review, adversarial review; the judge may reject a delivery
- Observability: per-task id, model, tokens, cost, escalations, judge verdict, error codes
- Error handling: timeouts, bounded retries, recovery after interruption
- Shared memory (project, agents, decisions) with validation
- Parallelism for independent tasks
- Usage-limit alert (5-hour session and weekly) in the dashboard

## Phase 4: make it a product
- Dashboard: activity, costs, performance, per-task history (why this agent, what cost, what verdict)
- Per-project budgets
- Simpler configuration, user documentation
- Engine decoupled from Claude Code, other model providers (long term)
- Library of specialised agents

## Security (ongoing)
- Retention policy, full purge and optional encryption of local logs
- Agent reports treated as untrusted input; per-agent permissions
- Audit the mail and watch features before calling them safe

