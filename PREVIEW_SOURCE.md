# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `998c7523c36e45e65dbb8a732785f99d4de3b400`, through merged PR #47 (household sound), published in private Site version 66 from `700d75eb2fd4fa72f7771866a33471ee52c14acc`.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- PR #44 merged the weather, wet traffic, sirens and mobile memory/recovery work. The current house-guide marker adds one module and aligns all 83 shipped files across candidate layouts. Publication/PR outcomes belong in the handoff. Browser startup still cannot create WebGL here; native visibility/geometry/projection tests do not establish rendered GPU appearance or physical-device performance.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
