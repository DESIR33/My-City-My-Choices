# My City, My Choices

An early browser-game prototype for a story-driven life-skills game. Chapter 1 takes place on Maple Street, a walkable 3D neighborhood where the player learns coin and bill values, starts a small business, serves customers, counts change, and chooses whether to save, reinvest, or try a fictional investment.

## Run locally

Serve the repository root over HTTP, then open it in a modern browser:

```sh
python3 -m http.server 8000
```

Visit http://localhost:8000. The Three.js engine currently loads from jsDelivr, so the browser needs an internet connection.

## Controls

- **WASD** or arrow keys: walk / drive
- **Mouse**: look around (click the game to capture the mouse)
- **E**: interact
- **F**: enter or exit a parked car

## Prototype scope

The current build is a single-player, single-file 3D prototype. It includes a procedural city district with roads, buildings, a family home, a market, NPCs, traffic, a mini-map, and Chapter 1’s money-and-business interactions. The city art is placeholder geometry; the supplied references set a higher target for environmental detail and visual fidelity. Online multiplayer, real-estate transactions, persistent saves, and production-quality character/building assets are future work.
