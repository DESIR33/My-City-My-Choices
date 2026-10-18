# My City, My Choices

An early browser-game prototype for a story-driven life-skills game. Chapter 1 lets the player choose one of four businesses: a Saturday market stall, a small restaurant, a neighborhood store, or a service business. Each has its own city location and startup costs. Players learn coin and bill values, count customer change using denominations, compare plans, calculate profit, and choose whether to save, upgrade their business, or try a fictional investment. Their choices carry into a second business day; an upgrade attracts two extra customers. Afterward, they can visit Thread & Sole downtown and buy clothes, shoes, a hat, or a backpack for their character. Shopping uses a planning basket: she adds items, totals the prices, checks whether she can afford them, then chooses to buy or revise the basket. Purchases reduce wallet cash while goal savings remain separate. The marketplace is one of several business opportunities in the city.

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

The current build is a single-player browser prototype. It includes a procedural city district with roads, buildings, a family home, a market, NPCs, traffic, a mini-map, Chapter 1's money-and-business interactions, a welcome screen with player name and appearance choices, and local save/continue. The first chapter includes a quarter-value question, exact-change practice using pennies, nickels, dimes, quarters, half-dollars, and $1 coins or bills, plus a downtown clothing and gear shop with persistent avatar purchases. The welcome screen uses original concept art; the playable city still uses prototype geometry and is below the supplied references' visual detail. Saves do not sync between devices. More business types and retail stores, online multiplayer, real-estate transactions, and production-quality character and building assets remain future work.
