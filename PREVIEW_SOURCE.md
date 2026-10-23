# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `ce0b4c1d5cb67301652852236547c6256d8fb8a8`, through merged PR #72. Before editing, private Site version 74/source `b2985e53f3b550ade8572a709c7d0dac97049d03` matched all 284 runtime files.
- Current candidate addresses the mobile car-entry report: stable mobile practical-light layout with shared-texture road-glow headlights, medium/far authored premium car detail, a pre-entry checkpoint and immediate input release/road height. Desktop lighting/detail stay unchanged. Actual device cause remains unverified; open interior PR #70 remains separate. Existing mobile/house/Ronda safeguards stay intact. Exact source/deployment/PR outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- Both candidate runtime layouts contain 284 shipped files, including original binary models and compressed textures. Native story/geometry/asset tests and isolated phone-width objective/touch checks do not establish rendered GPU appearance or physical-device performance. This QA browser cannot initialize WebGL. The standalone setup explains that graphics failure; no fresh rendered full-game success is claimed.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
