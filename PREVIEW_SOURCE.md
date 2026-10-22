# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `72ed6aa377f6b54a38714e302d0504868abb17c6`, through merged PR #44 (runtime reconciliation).
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- PR #44 merged the weather, wet traffic, sirens and mobile memory/recovery work from hosted source `d79f280a4fd3fa50aae6eb9b57e0a03ee4245059`, with all 80 shipped files matching. The current furnished-object chooser change is applied to both source layouts; publication/PR outcomes belong in the handoff. Native tests and isolated panel browser QA do not establish full GPU/device acceptance.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
