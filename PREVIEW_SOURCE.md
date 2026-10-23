# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `18377c941d9144e9a92584c8e015e63bce0c9025`, through merged PR #74. Before editing, private Site version 76/source `3979b091b1472c8591a3255055e66fe13cad0341` matched all 285 runtime files.
- Current candidate addresses reported coastal crashes and rejected mobile car appearance: zero mobile Flamingo practical lights, bounded palm submissions, simpler ocean shader and serial/incremental loading of compact authored GLS/Senna civilian cars. Startup deferral and save guards remain; desktop detail is unchanged. The same coastal route/save still requires a physical-phone retest. Open #70 stays separate. Exact source/deployment/PR outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- Both candidate runtime layouts contain 287 shipped files, including original binary models and compressed textures. Native story/geometry/asset tests and isolated phone-width objective/touch checks do not establish rendered GPU appearance or physical-device performance. This QA browser cannot initialize WebGL. The standalone setup explains that graphics failure; no fresh rendered full-game success is claimed.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
