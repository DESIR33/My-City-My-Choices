# Repository working instructions

## Read before editing

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) before making any change. It records the product, implementation, decisions, state contracts, known issues, roadmap, source/deployment differences and validation limits. Inspect current source and active PRs when those could have changed.

## Mandatory context maintenance

The owner requires `PROJECT_CONTEXT.md` to be updated after every change. Every nonempty change commit must include a meaningful update to that file, including fixes, tests, assets, dependencies, configuration, CI, documentation and reverts. Do not defer the context update to a later PR or commit.

- Update the relevant current-state sections, then add a dated change entry explaining the request, final behavior, affected systems, compatibility/migration, validation actually run, limits and remaining work.
- Keep implemented, proposed, merged and published states distinct. Remove resolved issues and stale roadmap claims. Never invent missing conversation details or claim tests were run when they were not.
- Read the known GitHub/Sites divergence before synchronizing runtime source. Preserve concurrent work and save compatibility. Do not copy one layout's index over the other without a focused diff.
- Never add secrets, session data, private personal details or unrelated chat transcripts.
- Stage context with the change; run `node scripts/check-context.mjs --staged` before committing. For committed work run `node scripts/check-context.mjs BASE_SHA HEAD_SHA`.
- The CI context check validates each commit, including follow-up fixes. Timestamps, whitespace-only edits and generic auto-generated filler do not replace useful context. Review the prose as well as the check result.

## Verification and handoff

Run focused checks appropriate to the edit and the required regressions. `npm test` runs the game's Node test files. Preserve original binary assets for asset-dependent tests. Do not add tests that only restate a low-impact prose edit; maintenance-check logic does need meaningful positive/negative tests.

Report rendered browser/device limits explicitly. Native geometry tests and simulated DOM fixtures do not prove GPU appearance, audio balance or device frame rate. In the final handoff link the PR, identify verification and any material open issue. Runtime edits and docs-only work have different publishing needs; a docs-only change does not require redeploying the game.
