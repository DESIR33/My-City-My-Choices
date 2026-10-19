# My City, My Choices

An early browser-game prototype for a story-driven life-skills game. Chapter 1 lets the player choose one of four businesses: a Saturday market stall, a small restaurant, a neighborhood store, or a service business. Each has its own city location, startup costs, and customer activity: read and match a restaurant order, find a store product, plan a service route, or count change at the market. Players learn coin and bill values, compare startup plans, calculate profit, and choose whether to save, upgrade their business, or try a fictional investment. Their choices carry into a second business day; an upgrade attracts two extra customers. Afterward, they can visit Thread & Sole downtown and buy clothes, shoes, a hat, or a backpack for their character. At chapter close, players can visit Maple Homes and compare a one-week rental with a fictional home purchase: a down payment followed by five simple installments. The choices reduce available cash while goal savings remain separate. A goal progress bar tracks savings toward a fictional bike, art set, or cozy home target. If wallet cash is short for day-two supplies, the player chooses whether to use goal savings or end the business story early with savings protected. A persistent story journal records the player’s major choices and outcomes, including supply costs, savings, upgrades, investments, shopping, rent, and loan payments. Shopping uses a planning basket: she adds items, totals the prices, checks whether she can afford them, then chooses to buy or revise the basket. Purchases reduce wallet cash while goal savings remain separate. The marketplace is one of several business opportunities in the city.

## Run locally

Serve the repository root over HTTP, then open it in a modern browser:

```sh
python3 -m http.server 8000
```

Visit http://localhost:8000. Three.js currently loads from jsDelivr, so the browser needs an internet connection. Chapter progress saves automatically in the current browser using local storage.

## Controls

- **WASD** or arrow keys: walk; while driving, W accelerates, S brakes/reverses, and A/D steer
- **Space**: handbrake while driving
- **Mouse**: look around (click the game to capture the mouse)
- **E**: interact
- **F**: enter or exit a parked car

## Prototype scope

The current build is a single-player browser prototype. It includes a procedural city district with roads, buildings, a family home, a market, NPCs, traffic, a mini-map, Chapter 1's business-specific customer activities and money interactions, a welcome screen with player name and appearance choices, a saved story journal, and local save/continue. The first chapter includes a quarter-value question, exact-change practice using pennies, nickels, dimes, quarters, half-dollars, and $1 coins or bills, plus a downtown clothing and gear shop with persistent avatar purchases. The welcome screen uses original concept art; the playable city still uses prototype geometry and is below the supplied references' visual detail. Saves do not sync between devices. More business types and retail stores, online multiplayer, advanced real-estate simulation, and production-quality character and building assets remain future work.


## City graphics

The city uses the pinned Three.js 0.180.0 renderer. `assets/city-visuals.js` provides original, deterministic surface textures, a physical sky and reflection environment, a local sun-shadow region, window interiors and glass, leaf-card tree canopies, and street furniture. Architectural surfaces use world-scale texture tiling, and static buildings and shop signs are merged by material to reduce draw calls. Detailed Mustang meshes use physical paint, glass, and metal materials.

The graphics pass also corrects the tower floor stack, porch supports, roof fascia, and home paths. Street details include curb blocks that stop at intersections, tactile pavement, connected benches, bins, drain grates, and manhole covers. Maple Homes has a physical office and matching interaction/map location outside the road.

The game remains a browser prototype with procedural architecture and prototype characters. Full WebGL visual QA requires a working browser preview; syntax and scene-geometry checks do not establish final visual quality or a frame-rate target.
