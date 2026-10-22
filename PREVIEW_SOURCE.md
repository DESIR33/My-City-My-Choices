# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `f6cfe96b77fdc1ab139e338413087bebba0fd5a2`, through merged PR #45 (household object choices), published in private Site version 64 from `4cfc3712b3bd3c46702600b5c28cd7d2cc525b6f`.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- PR #44 merged the weather, wet traffic, sirens and mobile memory/recovery work. The current two-floor house map/location guide adds one module and aligns all 81 shipped files across candidate layouts. Publication/PR outcomes belong in the handoff. Native tests and isolated panel browser QA do not establish full GPU/device acceptance.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
