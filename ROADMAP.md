# Kinan Orchestre: improvement ideas

These are improvement ideas, not features already in place. Nothing below is delivered. We will move step by step.

## Phase 1: consolidate the foundations
- Install test on an outside machine (Windows, then macOS and Linux)
- Automated tests (scripts, hooks, dashboard startup)
- Interruption and failure tests: silent agent, failing hook, corrupted config, stuck task
- Concurrency: locking when two agents touch the same files
- Document each agent's permissions and allowed tools
- Working public demo
- Updates: explanation at the top of the README, version check in the dashboard

## Phase 2: prove the value
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

