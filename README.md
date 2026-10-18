# My City, My Choices

An early browser-game prototype for a story-driven life-skills game. Chapter 1 begins with one small-business opportunity at the Maple Street market, then opens into the wider city economy. Players learn coin and bill values, count customer change using denominations, compare startup costs, calculate business profit, and choose whether to save, upgrade the stand, or try a fictional investment. Their choices carry into a second market day. Afterward, they can visit Thread & Sole downtown and buy clothes, shoes, a hat, or a backpack for their character. Shopping reduces wallet cash while goal savings remain separate, making tradeoffs visible. The marketplace is the first business chapter, not the whole city.

## Run locally

Serve the repository root over HTTP, then open it in a modern browser:

```sh
python3 -m http.server 8000
```

Visit http://localhost:8000. Three.js currently loads from jsDelivr, so the browser needs an internet connection. Chapter progress saves automatically in the current browser using local storage.

## Controls

- **WASD** or arrow keys: walk / drive
- **Mouse**: look around (click the game to capture the mouse)
- **E**: interact
- **F**: enter or exit a parked car

## Prototype scope

The current build is a single-player browser prototype. It includes a procedural city district with roads, buildings, a family home, a market, NPCs, traffic, a mini-map, Chapter 1's money-and-business interactions, a welcome screen with player name and appearance choices, and local save/continue. The first chapter includes a quarter-value question, exact-change practice using pennies, nickels, dimes, quarters, half-dollars, and $1 coins or bills, plus a downtown clothing and gear shop with persistent avatar purchases. The welcome screen uses original concept art; the playable city still uses prototype geometry and is below the supplied references' visual detail. Saves do not sync between devices. More business types, additional retail stores, online multiplayer, real-estate transactions, and production-quality character and building assets remain future work.
