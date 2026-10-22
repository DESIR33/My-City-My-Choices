# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `998c7523c36e45e65dbb8a732785f99d4de3b400`, through merged PR #47 (household sound), published in private Site version 66 from `700d75eb2fd4fa72f7771866a33471ee52c14acc`.
- Follow-up base: open PR #48 at `97fd6a53a8a79af51e1882b55217cbb8173007b1`; its house marker is published in private Site version 67, source `c793a7bf14ac88d76c97253c798fdeedecff2fce`. This decorating change preserves that work and targets its branch while it remains open. Exact PR/deployment outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- PR #44 merged the weather, wet traffic, sirens and mobile memory/recovery work. The marker brought the runtime to 83 files; textile styling reuses existing modules/materials and keeps that inventory aligned across candidate layouts. Browser startup cannot create WebGL here; native material/geometry tests do not establish rendered GPU appearance or physical-device performance.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
