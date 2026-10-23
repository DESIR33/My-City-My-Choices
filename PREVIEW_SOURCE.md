# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `ee8e02cd6d1c8c2a2ef93ed2f053d719a8e949fb`, through merged PR #73. Before editing, private Site version 75/source `78c38d04e15ad7490da60976b0f4e1c11d9c4a4f` matched all 284 runtime files.
- Current candidate responds to persistent mobile crashes, especially onboarding. It defers the full runtime until Start/Continue/Save backups, preserves setup/save guards and reduces optional mobile world detail and character loading concurrency. Desktop stays eager. Prior mobile safeguards remain; open interior PR #70 stays separate. Exact source/deployment/PR outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- Both candidate runtime layouts contain 285 shipped files, including original binary models and compressed textures. Native story/geometry/asset tests and isolated phone-width objective/touch checks do not establish rendered GPU appearance or physical-device performance. This QA browser cannot initialize WebGL. The standalone setup explains that graphics failure; no fresh rendered full-game success is claimed.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
