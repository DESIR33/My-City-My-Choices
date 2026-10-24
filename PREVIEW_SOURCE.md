# Playtest source and project context

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) before editing and update it in every change commit, following [AGENTS.md](AGENTS.md).

- Repository: https://github.com/DESIR33/My-City-My-Choices
- Owner-private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site
- This publication synchronizes main through merged #82, including repaired #70/#76/#77/#78/#80, Northstar skyline, airport and Metro Red Line. The previous Site v80 snapshot matched GitHub `f58e11c36bf04e83d6eed6a0a484cefa8b1ea42e`; it lacked the later merged features. Exact deployment/source/version evidence belongs in the PR and final handoff.
- GitHub serves root `index.html`/`assets/`; Sites uses `dist/index.html`/`dist/assets/`. Preserve original binary assets and existing hosting identity/audience. Tests use layout-specific paths.
- Run `npm test` in both checkouts and `npm run check:parity -- /absolute/path/to/site-checkout` before publication. Parity compares the complete inventory/hashes and does not copy or deploy. CI does not independently access the private Site.
- Node/native tests do not establish rendered GPU appearance, audio balance, total memory or actual iPhone stability. The previously reported mobile crashes and Sunshore boulevard obstruction remain unconfirmed. Never erase the owner's saves to test them.
- Documentation-only changes do not require redeployment. Runtime publication must use the exact verified source/archive.
