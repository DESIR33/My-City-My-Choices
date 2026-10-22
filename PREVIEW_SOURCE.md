# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the current implementation, roadmap, evidence and known differences between GitHub and the private playtest. Update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- Audited repository baseline: `9164760108e6bcc5c5c592f4f92b30c461078d38`, through merged PR #59. This fix moves the menu to P, leaves Escape for cursor release/panel closing, furnishes 139 Willow Way downstairs and removes coplanar neighboring floor/foundation faces.
- Previous private Site: version 68/source `7c02849485203d6588f04611e6c3b32091fc042a`, behind main. This candidate reconciles main's merged learning, tier economy, realism and crowd work into the hosted layout before applying the fix. Exact new source/deployment/PR outcomes belong in the handoff.
- GitHub serves root `index.html` / `assets/`; the separate hosted source uses `dist/index.html` / `dist/assets/`.
- Both runtime layouts contain 243 shipped files, including original binary models and compressed textures. Native geometry, floor, route, keyboard and save tests do not establish rendered GPU appearance, pointer-lock behavior on the player's desktop or physical-device performance. This QA browser cannot initialize WebGL or acquire pointer capture; isolated DOM shortcut/panel checks work.
- Run `npm run check:parity -- /absolute/path/to/site-checkout` to compare the complete runtime inventory and hashes, including binary assets. It is read-only and does not copy, authenticate or deploy. Non-runtime docs/tests differ intentionally. Full game CI runs native regressions and checker unit cases, not a private-Site comparison.
- Documentation-only changes do not imply a new deployed game version. Use exact commit/archive/deployment evidence for future publication claims.

Earlier navigation/courier validation notes described a historical snapshot. Current gameplay and verification limits are maintained in the context document.
