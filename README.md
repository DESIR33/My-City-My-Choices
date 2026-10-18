# My City, My Choices

An early browser-game prototype for a story-driven life-skills game. Chapter 1 takes place on Maple Street, a walkable 3D district where the player learns coin and bill values, practices counting customer change with selectable denominations, starts a small business, compares a low-cost kit with a higher-risk premium kit, calculates business profit, and chooses whether to save, reinvest, or try a fictional investment.

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

The current build is a single-player browser prototype. It includes a procedural city district with roads, buildings, a family home, a market, NPCs, traffic, a mini-map, Chapter 1's money-and-business interactions, a welcome screen with player name and appearance choices, and local save/continue. The first market chapter includes a quarter-value question and exact-change practice using pennies, nickels, dimes, quarters, half-dollars, and $1 coins or bills. The welcome screen uses original concept art; the playable city still uses prototype geometry and is below the supplied references' visual detail. Saves do not sync between devices. Online multiplayer, real-estate transactions, and production-quality character and building assets remain future work.
