# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `ab5efb1ac5439356244e92ba4341feed86952bee`, through merged PR #60. Current private Site version 69/source `c1bf138d390ad6fa8c664ba6415233d036af8add` includes the cursor/menu, 139 floor/furnishing fix and all prior merged runtime work.
- This candidate adds a three-step renderer-independent onboarding, static goal cards with age-adjusted amounts, visible navigation, saved-story confirmation/recovery and explicit city readiness/failure. Exact new source/deployment/PR outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- Both candidate runtime layouts contain 245 shipped files, including original binary models and compressed textures. Native and browser onboarding checks cover setup UI; they do not establish rendered GPU appearance or physical-device performance. This QA browser cannot initialize WebGL. The standalone setup works through that failure and explains why play cannot start.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
