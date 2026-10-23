# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `8b08b4e2ef15dff3b20fe9ff15c8433bf942b904`, through merged PR #67. Private Site version 71/source `108127efdd1205e22b85f095f99dd08072932832` has matching runtime, including the startup fixes and recent assets.
- This candidate mitigates the iPhone/iPad crash reported near 101 Maple Grove: baked mobile room lighting, stable desktop room-light layout, avatar shader prepared before entry and collision synchronization only for moving/restored doors. Exact device cause remains unverified; no save/economy or house geometry changes. Exact new source/deployment/PR outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- Both candidate runtime layouts contain 252 shipped files, including original binary models and compressed textures. Native story/geometry/asset tests and isolated phone-width objective/touch checks do not establish rendered GPU appearance or physical-device performance. This QA browser cannot initialize WebGL. The standalone setup explains that graphics failure; no fresh rendered full-game success is claimed.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
