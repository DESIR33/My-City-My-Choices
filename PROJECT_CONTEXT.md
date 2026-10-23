# My City, My Choices — project context

Last updated: 2026-10-23 (America/New_York). Maintained project handoff, product brief, architecture guide, decision record and change ledger.

**Read this document before changing the project. Update it in every change commit, including fixes, assets, configuration, tests and documentation.** See [Maintenance contract](#maintenance-contract). This is the current-state guide; Git history and linked PRs retain implementation detail and earlier states.

## Start here

My City, My Choices is a single-player, third-person browser life-skills game. A child avatar learns to earn, budget, save, run a business and make deliberate spending decisions while exploring three connected districts. The city must feel like a place to live: believable homes, shops, neighbors, vehicles, public spaces and useful interactions. It is an evolving playable prototype, with a premium cinematic direction and a strong mobile/desktop usability requirement.

- Repository: [DESIR33/My-City-My-Choices](https://github.com/DESIR33/My-City-My-Choices).
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site (owner access required; do not change sharing without a request).
- Audited GitHub baseline: `2784684a408617718c9c413c8a0ba0caffce6c71`, through merged PR #68. Private Site version 72, source `36e4e047b404e6a210d0717a4b7a6ebe3ca3b9b7`, includes the entry shader/light/door mitigation. The owner still reports a page reload/close when entering 101 on iPhone/iPad and confirms the issue is mobile-only. The current candidate further reduces mobile startup graphics and optional furniture memory, shares the texture decoder pool and releases it after loading. Exact new publication/PR outcomes belong in the handoff. Older ledger entries record status when written and do not override this snapshot.
- The repository serves root `index.html` and `assets/`. The separate Sites checkout serves `dist/index.html` and `dist/assets/`. They are related source layouts, not interchangeable directory trees.
- Current major feature: furnished 101 Maple Grove Lane, connected to renting/buying, improvements, daily reviews and an optional settling-in guide.
- Current neighborhood update: 27 illuminated front-wall address plaques, 79 shared animated neighborhood doors plus the furnished home's six doors, explicit desktop/touch entry prompts and a world-map address directory. 139 Willow Way has a furnished, partitioned ground floor; 13 other shells have the supplied living-room set, while the remaining 12 have empty ground floors. Only 101 Maple Grove has two furnished interactive floors. Eleven fire extinguishers offer a nearby safety lesson. Actual-device stability and GPU playtesting remain priorities.
- Learning layer (merged in PR #50; published in Site version 69): Chapter 1 questions come from seeded skill generators with age tiers, per-skill mastery, a placement warm-up, a three-plan Garden Club and a PIN-protected Parents page. See [Learning layer](#learning-layer-adaptive-skills-garden-club-and-parents-page).
- Tier-scaled story money (merged in PR #51; included in this reconciled candidate): the age tier now also sets the money scale. Sprout keeps today's coin economy; Builder uses ×10 amounts plus weekly savings interest; Planner uses realistic amounts with a weekly paycheck and taxes, loans with interest and monthly bills. See [Tier-scaled story money](#tier-scaled-story-money).
- Multiplayer, server-assigned properties, cloud save synchronization and a production real-estate economy are not built.

### Evidence and confidence

The current source tree, runtime imports, module code, README and PR history through #50 were reviewed for this document. A merged PR is historical evidence, not proof that all its changes remain in today's tree. Earlier implementation notes and test counts in README are chronological and can be stale. Use this document's current-state distinctions and inspect source before changing behavior.

**Runtime reconciliation:** the current handoff reconciles Site version 70 to main through #66 plus the first-step guide, including the binary sofa/extinguisher assets. There are 252 shipped runtime files in both candidate layouts. The inventory/hash comparison includes binary models, baked light and compressed textures. Docs/tests retain their layout-specific paths. Parity does not establish browser/GPU/device acceptance.

## Contents

1. [Product intent and decisions](#product-intent-and-decisions)
2. [The player experience](#the-player-experience)
3. [World and landmarks](#world-and-landmarks)
4. [Economy and persistent life](#economy-and-persistent-life)
5. [Movement, vehicles and traffic](#movement-vehicles-and-traffic)
6. [Rendering, sound and interaction](#rendering-sound-and-interaction)
7. [Architecture and source map](#architecture-and-source-map)
8. [State, saves and compatibility](#state-saves-and-compatibility)
9. [Development and delivery](#development-and-delivery)
10. [Validation and known issues](#validation-and-known-issues)
11. [Roadmap and unresolved scope](#roadmap-and-unresolved-scope)
12. [Maintenance contract](#maintenance-contract)
13. [Change ledger and history](#change-ledger-and-history)

## Product intent and decisions

### What the owner has asked for

| Request / reference | Meaning for the product | Current state / limit |
| --- | --- | --- |
| Planned U.S. community, like D.R. Horton; more than 20 two-story houses, individual driveways/backyards, some privacy fences | Intentional roads, lots and front/back access; coordinated variation instead of scattered buildings | 27 homes, including 24 new and three rebuilt originals; 18 fenced yards |
| Modern yet rustic playground/plaza, inspired by Magnolia in Waco | Community gathering, warm timber/brick/stone, dark metal, planting, seating and play | Original Maple Commons layout at the frontage identified from the supplied screenshot |
| Clean, complete, cinematic architecture and believable materials/physics; GTA 6 as an aspiration | Improve actual asset quality, lighting, road logic and handling while preserving a playable browser game | PBR procedural materials, architectural detail, quality modes and better vehicles; not GTA 6 parity. 101 Maple Grove has scanned CC0 materials, baked indirect light and CC0 furniture models (merged, PR #52); scanned surfaces for the whole city merged (PR #53) |
| Homes and people as realistic as possible, close to GTA 6 (owner references, Oct 2026) | Stay in the browser; pilot lighting and materials on 101 Maple Grove first, then extend to other homes and to people | House pilot merged (PR #52); city scanned surfaces merged (PR #53). People variety, roughness maps, kids and pets merged (PR #54). Ambient gestures, conversations and the phone crowd cap merged (PR #55). Seated idles and floor-fitted legs merged (PR #56). Scanned lawns merged (PR #57). Leaf-card shrubs merged (PR #58). Foliage wind merged (PR #59). Owner-supplied sofa set in every other home merged (PR #64). Owner-supplied fire extinguishers merged (PR #65) |
| Kids and pets alongside adults (Oct 2026) | More children around the city; dogs and cats in the neighborhood | Two crowd kids plus three playground kids merged (PR #54). Realistic animated pets are not free; owner chose free low-poly pets for now |
| First house as a major interactive landmark that should wow players | Open a real door, physically enter, explore furnished floors and use household objects | 101 Maple Grove has rooms, stairs, furniture and household actions |
| Eventually assign homes to players; rent, purchase and improvements | Persistent property identity, financial consequences and extensible state | Local single-player assignment/rental/purchase/projects now exist; multiplayer assignment does not |
| Cars in driveways and no confusing road-like empty spaces with trees in them | Connected road surfaces; real parking footprints; landscape pockets should read as planting | Eight driveway cars, cleared road stubs, driveway cuts and twelve planted pockets |
| Less screen clutter on phones and desktop | Preserve the central view; contextual actions; consolidated menu | Compact HUD, Focus view, one objective/route line, context-sensitive controls |
| Jump, correct foot placement and different footsteps by surface | Physical height and grounding must agree with animation and sound | Jump integration, calibrated foot contact and surface sound profiles |
| Congestion, horns and other city activity | City time affects bounded traffic demand and queues | Rush/quiet modes, queue horns, pedestrian yielding, manual horns/bells |
| Door interaction feedback and attractive front-wall addresses on every house | Players must recognize an interactive entrance and identify properties from the street | 27 shared-atlas front-wall plaques, addressed Open/Close prompts and an address directory; physical-device visual acceptance remains open |
| Keep full project context updated after every change | Future people and agents should not repeat research or lose decisions | This document, root AGENTS instructions, PR checklist and CI policy |

The design references are inspiration, not a claim of affiliation or a licensed recreation. The 18 uploaded images (`IMG_5227` through `IMG_5247`, selected filenames) and `IMG_5260.jpeg` informed prior discussions. They are user-provided reference material, not guaranteed repository assets or a reusable production asset license. Temporary `/workspace/scratch/...` paths are not durable project references. If a source image is missing, recover or request the relevant reference; do not invent visual details or block unrelated code work.

### Durable engineering and UX decisions

- Keep protected goal savings separate from wallet spending. Explicit transfers or reviewed choices are required before savings are used.
- Use integer cents for transaction quotes/catalogues; legacy story balances also use dollar numbers. Convert at boundaries deliberately. No negative balances, duplicate charges, stale checkout callbacks or repeated rewards.
- Fictional prices teach arithmetic and tradeoffs; they are not realistic housing/vehicle valuations or investment advice.
- Shared world data must drive rendering, roads, collision, navigation, maps and emergency routes. Do not draw an attractive road that the simulation cannot drive.
- Keep doorways, curbs, parking, stairs, seat exits and front walks physically usable. Whole vehicle footprints matter, not just their center points.
- Preserve existing save identities, vehicle ordering, wardrobe ownership, receipts and paid housing balances across changes.
- Keep essential interactions nearby and explicit. Maps guide; they do not autopilot. Interiors must support the camera and physical movement, not just a menu pretending a room exists.
- Prefer shared geometry, instancing, bounded pools and geographic detail budgets. Avoid per-frame asset allocation or scanning every scene triangle.
- Do not add permanent HUD buttons for each feature. Use City menu, the existing objective line and contextual prompts.
- Keep the current Three.js implementation working. Unreal migration and Rapier were discussed/evaluated; neither is an implemented migration or runtime dependency. A different engine requires a new scope decision.
- Describe tests honestly: native geometry, simulated DOM and CPU projections cannot establish GPU visual quality, audible balance or mobile frame rate.

## The player experience

1. Choose name, appearance and a savings goal on the welcome screen; start or continue a local story.
2. Meet Mom near the original Maple Street front door for the wallet/money lesson. This original story home is distinct from 101 Maple Grove.
3. Meet Maya, compare startup kits and select one of four businesses. Serve scripted customers using reading, matching and change-counting tasks.
4. Review revenue, costs and profit. Save, improve the business or choose a fictional garden/investment plan. Open another day deliberately.
5. Explore shops, café/bakery, cities, beach, parks/plaza, vehicles and delivery opportunities. Optional earnings help players recover from an empty wallet.
6. After business day two, compare housing and car choices. Renting/buying connects the player to the furnished Maple House. Tour it freely before committing.
7. Optionally follow Help me settle in: arrive home → enter → upstairs wardrobe → rest → stand → daily review. The guide never gives money, charges bills or advances time automatically.

### Starting and continuing a story

The welcome experience is now three steps: Your player → Your goal → Ready to play. Step one offers a name (blank uses Player), optional age 6–12 and collapsed appearance choices. Step two prominently shows the bike, art-set and cozy-home goal cards, their descriptions and savings targets. No goal is preselected. Step three reviews name/goal/target/question tier, explains meeting Mom at the front door and the current desktop/touch controls, and offers optional parent PIN setup. Next cannot skip goal selection; Back preserves the draft, and the fixed panel footer keeps navigation visible while content scrolls. Focus moves to each step heading, Tab stays in the active setup controls, and selected options expose `aria-pressed`.

`onboarding.js` runs as a separate local module with no Three.js dependency, and the goal buttons are shipped HTML rather than created after world construction. Setup works while the world is loading or when it fails. `onboarding.css` provides responsive phone/landscape layouts and a non-tiling market-art backdrop. Goal previews use the actual economy conversion and age tiers; no age defaults to Builder, matching start behavior. Setup changes do not spend money, write a story or change active progress. The draft lives in form controls only; the real start handler validates/reads the selected goal and appearance before normal initialization.

World initialization marks `data-city-ready` only after the first animation call succeeds. Until then Start, Continue and backup tools remain disabled. A startup graphics failure produces an inline explanation and Try lighter graphics action rather than an overlay obscuring setup; an uncaught error from the game's own scripts (same-origin file) before the city is ready offers reload at once. Errors that are not the game's own (a cross-origin "Script error." from a host overlay or browser add-on, a stray promise rejection from a streamed asset) only show the reload message if the city is still not ready 20 s later, and a city that then becomes ready clears that generic message; specific messages such as the graphics failure are never cleared. Goal selection and back/next still work. The retry uses the existing Basic-mode reload path when available. This does not make unsupported graphics hardware playable.

A validated existing primary save gets a prominent Continue card, revalidated on use. New story creation requires explicit replacement consent; the existing `resetSave` path must keep the old valid story in `mapleStreetRecoveryV1` before replacement. If that recovery write fails, starting is blocked and the old primary stays intact. Duplicate Start calls cannot reset a running story. The parent PIN must be blank or exactly four digits. Existing story/save identities, prices, goals, wardrobe, learning, ownership and household state formats remain unchanged; normal Continue restoration is reused. Corrupt primary data is not offered as a valid Continue choice; existing backup/recovery tools remain available after the world loads.

### Gameplay controls

During the first two story stages, the existing objective line now gives rounded distance and one of eight world directions to Mom or Maya (north is negative Z). When the actual nearby selection is that person, it changes to Press E · Talk to Mom/Maya or Tap Talk to Mom/Maya, with the same named touch button. Door priority stays intact: a selected nearby door produces a nearby/move-clear hint instead of telling the player to talk. Sitting and vehicles give stand/step-out hints. This is guidance derived from existing stage, actor positions and nearby selection, not navigation, automatic interaction or a new saved field. It runs at most five times per second during active play and changes DOM text only when needed; later business objectives retain their existing behavior. PR #63's fading world markers remain intact.

| Situation | Desktop | Touch |
| --- | --- | --- |
| Walk / look | WASD/arrows; mouse look after capture | Left stick; drag the scene with another finger |
| Run / jump | Shift / Space on foot | Run / Jump |
| Interact / sit / stand / doors | E near a valid target | Contextual Interact/Sit/Stand button |
| Enter/exit car; mount/dismount | F; E also mounts nearby two-wheelers | Contextual vehicle action |
| Car pedals and steering | W throttle, S brake/reverse, A/D steer, Space handbrake | Driving stick and brake/exit controls |
| Two-wheeler recovery | R+S walks backward; dismount when stopped | Walk back + down, Rear brake, Dismount |
| Horn / bell | H while mounted | Jump position becomes Horn/Bell |
| City menu / map / cursor | P for menu; M for map; Escape releases mouse | Menu and route/map affordances |

Default play HUD has Menu, a compact cash badge and one objective or route cue. Focus view hides cash and cues but retains Menu/essential controls. Dialogs pause gameplay, hide the play HUD, clear held inputs, support Escape and contain keyboard focus. The complete planner, map, journal, wardrobe, home and settings remain in City menu. Mobile layouts account for safe areas and landscape; contextual controls should not occupy the center of view.

Escape never opens the city menu. During play it leaves the browser's default release behavior intact and explicitly releases pointer lock/clears held inputs. Closing a panel with Escape uses `hide(false)` so the mouse stays free; click the game canvas to capture it again. P opens the menu or closes the current panel/resumes, ignoring repeat, modified browser shortcuts, editable fields and the welcome screen. The existing Menu button and desktop help advertise P. Any pointer-lock loss clears movement/jump/touch input. Native event/DOM tests cover these paths; actual pointer capture and OS/browser Escape behavior still need desktop-device acceptance.

In the furnished house, E / the touch action opens a compact chooser when multiple household objects are reachable. The prompt gives the nearby object count and the touch action says Choose object. An isolated object still acts directly, and doors retain direct Open/Close actions. The chooser uses the existing paused dialog, gives current appliance/light/curtain/TV/bed states and revalidates floor, distance and clear approach on every selection. Toggling refreshes the choices; sitting closes the dialog, while beds, wardrobe and home plans open their existing flows. It adds no permanent HUD button.

**City menu → House rooms & objects** opens the paused house guide; the nearby-object chooser links to it too. Switch Downstairs/Upstairs to inspect walls, furniture, the six household door leaves, stairs and room names. Gold marks the player's position on its actual floor; a teal star marks the selected object's approach point. The room directory lists all 25 furnished non-door interactions. Selecting one closes the panel and shows a location cue in the existing route line while inside: use the east-side stairs, open a room door, or interact nearby. A city destination stays selected and its cue returns outside. Focus view retains its existing hiding behavior. Successful interaction with the selected object clears the guidance; Stop house guidance cancels it. Outside, use the explicit Directions to the house button for city navigation.

A selected object also gets a small stationary mint floor ring and diamond at its real approach point when nearby. It is visible only on the same floor, within six meters, with clear player/camera sightlines against the household collision boxes and moving door leaves. The camera must stay between that floor and ceiling. It hides during stairs/jumps beyond the floor tolerance, outside, menus/background, driving/riding, sitting/resting and Focus view. Canceling/completing the existing guide or restoring an invalid target hides it automatically. It indicates where to stand, not an outline of the furniture, a walking path or an automatic interaction. Existing text/map guidance still works when the marker is hidden.

## World and landmarks

World units are approximately meters; X is east/west, north is negative Z, south positive Z. This is a continuous fictional world, not a georeferenced real city.

| Area / landmark | Location / access | What is built |
| --- | --- | --- |
| Maple Street | Central district; original Mom/market story | Road grid, shops, businesses, residents, police/fire services, Motors, café, bakery, Thread & Sole and home office |
| Maple Grove | West of Maple Street; World map destination | Connected planned community with 27 two-story homes, drives, patios/backyards, 18 fences, open side gates, four elevations/six palettes, street signs, monuments and lighting |
| 101 Maple Grove Lane / The Maple House | Property `maple-grove-1`; center `(-272,-204)`; porch `(-269.32,-196.5)` | First furnished interactive home, rent/buy assignment, projects, review and settling guide |
| Maple Commons | Maple frontage X 70.5–109.5, Z -27.5–-10.5 | Recessed shops, brick/stone plaza, timber pergola, festoon lights, picnic/bench seating, lawn, planting, play tower/stairs/slide and stepping logs |
| Maple Cafe | Around `(-30,-34)` | Enterable interior/terrace, cashier and NPC service, player paid ticket queue, seating and physical cups/food |
| Maple Bakery | North-central Maple; use shared BAKERY entry/counter data | Enterable counter, outdoor tables/umbrellas, food orders and courier pickup |
| Thread & Sole | Store around `(42,30)` | Enterable racks, mirror, mannequins, cashier and persistent clothing purchases |
| Maple Motors | Around `(-90,105)` | Fictional car comparison/purchase, fuel/service, free roadside recovery and saved owned coupe |
| Maple Fire & Rescue | Around `(150,-90)` | Procedural detailed engine, four firefighters and service landmark; no full playable firefighting simulation |
| Police station | Eastern Maple, near `(150,-30)` | Enterable station, 20-officer roster, three station cruisers and two patrol cars |
| Rivergate Bridge / river | North connector | Only legal river crossing; raised suspension bridge, 220 m river span, separate walkways and smooth 200 m approaches, below 6% grade |
| Northstar City | Main boulevard near Z -1150, about 1 km beyond Maple | 15 named skyscrapers, restaurants/offices/residential exteriors, roads, sidewalks, signals, residents and Northstar Motors |
| Sunshore City | First intersection Z 1080; about 1 km south | Kilometer Ocean Drive, two inland avenues/seven connectors, 24 pastel art-deco exteriors, neon, animated ocean, beach and promenade |
| Sunshore Motors | `(-15,1114)` | Physical fuel/service access using the existing owned-car/wallet systems |
| The Flamingo | Tall 45 m coastal hotel, street approach near `(-30,1987)` | Automatic entrance, lobby, elevator, Sky Lounge and Guest Suites; only the tall hotel with this name is enterable |

Most city exteriors are scenery. All 27 community homes now allow ground-floor entry; only the first has a furnished second floor. Do not promise full interiors in every tower/home. The bridge, coastal roads and sidewalks are continuous. Northstar travel is intentionally a drive or a long walk, not an automatic teleport. The beach is walkable; swimming and driving into the sea are not enabled. Guardrails have actual beach-access gaps. Sunshore includes lifeguard towers, umbrellas/loungers, six usable ocean-facing benches, palms and residents.

### The first furnished house

Ground floor: entrance/gallery, living room with sectional/coffee table/media console and TV, kitchen with island/counters/sink/fridge/oven/drawers, dining table/chairs and utility/workbench/laundry space. Upstairs: two bedrooms with beds/nightstands, wardrobe/dresser, bathroom with basin/bath/shower/toilet and landing study. Rugs, textiles, curtains, plants, art, switches and warm fixtures finish the rooms. Thirty original interaction points cover doors, seating, beds and household objects; later home-life hooks add the entrance review/ownership experience.

Six animated physical doors cover front, patio, utility room, two bedrooms and bathroom. Collision follows each leaf's current angle; closing refuses an occupied sweep. Stair geometry has 18 real treads and a true upper-floor opening. Ground level is 0.30 m, upper floor 3.45 m; floor selection uses current height rather than taking the highest surface at the same X/Z. Furniture obstacles have vertical intervals so a downstairs table cannot block upstairs walking. Indoor camera limits and stair headroom are separate from exterior roof height.

Seating and beds have clear stand-up points; beds pose the real character horizontally. TV cycles three original drawn channels/off; taps, shower, lights, washer, drawers, curtains and appliance fronts have state/visual responses. Some household interactions are text feedback, not a detailed appliance simulation. The model-home overhead garage now opens using the shared neighborhood door system; its utility-room furniture remains in place, and vehicle collision still excludes driving through houses. Wardrobe reuses owned clothes; it does not grant paid items.

The main bed and bedroom curtains share the same approach point. A nearest-object-only prompt previously selected the bed every time at that point. `nearby(position)` now exposes every reachable interaction and the chooser makes each independently available, including tightly grouped kitchen and bathroom fixtures. Discovery and execution share the same reachability check, including finite coordinates, real floor and closed-door obstruction. The existing household flags/save version are reused; this is an interaction improvement with no new geometry, lights or render targets.

Realism pilot (merged, PR #52): house surfaces now use nine scanned CC0 Poly Haven materials (laminate floor, painted plaster, red brick, roof tiles, paving, two woods, two fabrics) as KTX2 textures, with plain colors kept as the fallback. Static house meshes merge per material into an atlas with a baked indirect-light map (`assets/house/bake/`), so rooms darken away from windows and under furniture while the sun and lamps stay live. A probe grid in the same bake dims the player and Mom indoors. Ten box stand-ins (three dining chairs, coffee table, media console, two nightstands, three plants) are replaced by six simplified CC0 models once they load; stand-ins keep colliders and seats, so gameplay is unchanged if a model fails. Wall pieces are smoothed per face, so faint seams can show where separate wall boxes meet.

The latest home-life work adds a personalized plaque and three visual projects without new collision boxes or lights. Earlier first-house-only geometry measurements (87 meshes / 11,130 triangles) are historical; PR #40 reported 99 meshes / 11,850 triangles after home-life additions. None of these numbers measure total game GPU memory or real frame rate.

House-guide plans are SVG built on demand from the actual house collision boxes, live household door bounds and action approach points. `HOUSE_ROOMS` groups actions and identifies the utility/main/second-bedroom/bathroom doors; update this metadata and its tests when changing the architecture. Plans are location diagrams, not computed walking routes. They do not draw a line through walls, move players, open doors or activate furniture. The shared neighborhood overhead garage door is outside the six household leaves shown. Closed exit-door hints take precedence before changing floors. No new scene meshes, lights, textures or render targets are allocated.

The separate in-world marker uses two fixed meshes (72 triangles total) sharing one unlit, translucent, front-facing material. Depth testing remains enabled; it adds no lights, shadows, textures or postprocessing targets. It is excluded from camera-architecture snapshots and adds no collision/navigation/shelter boxes. Target lookup is cached per house and segment checks inspect only that house's bounded collider list, not every scene triangle. Updates run after camera following and reuse the original geometry/material. This is a tiny rendering addition; native tests cannot establish its GPU appearance or device frame rate.


### Neighborhood entry and finding addresses

139 Willow Way (`maple-grove-20`, center `(-176,-24)`) now has a furnished ground floor: plaster inner faces and full-height partitions, open room passages, sofa/coffee table/media console/TV, kitchen counters/sink/oven/fridge/island, a four-chair dining table, guest bed/nightstand/dresser and a separated garage/workbench. All pieces use the existing static instance batches and shared materials, with actual furniture/wall collision and per-piece camera bounds. `furnishedInteriors` exposes construction metadata for regression checks. There are no added lights, textures, ownership assignments or household action/save flags for 139. Its furniture is scenery; its three existing doors work, while the upper floor remains inaccessible. 101 keeps its complete two-floor interactive experience. Thirteen other neighboring shells now contain the supplied living-room set; twelve remain empty.

All 26 neighboring house slabs now top out at 0.27 m, beneath the unchanged 0.30 m finished wood floor. Previously both broad top faces occupied 0.30 m and competed in the depth buffer. Lowering the foundation removes that shared plane without changing walk height, saved player coordinates, door thresholds, street/lot data or ownership. The flagship home's separate baked construction is untouched. Native downward rays inspect the actual instanced geometry and confirm exactly one finished-floor hit at each neighboring home, with stable footing and no new floor-height registration.

Every neighboring front/patio/garage door now has an animated shared-instance leaf, live height-aware collision, nearby addressed Open/Close labels and player sweep protection. The model-home garage uses the same system; its original six household doors remain separate. Mobile prompts are visible above the controls and the contextual button says Open/Close door or garage. Neighboring homes have registered wood floors and indoor camera limits; 139 is furnished downstairs, thirteen other shells have living-room sets and twelve remain empty. Their upper floors remain closed. Neighborhood door positions are session-local and reset closed on reload; furnished-home state retains its existing save contract.

All 27 front-wall plaques use one 1024-pixel number/street atlas with brass/dark backing and a night glow. Rendering, labels and the new **World map → Maple Grove · Find an address** directory share `COMMUNITY_HOMES`. The directory groups all addresses by street, routes on foot to exterior front walks and by vehicle to the spare driveway bay, and preserves selected address IDs through the existing navigation save. It adds no permanent HUD controls, charges or ownership changes.

Living-room sofa sets (merged, PR #64): every other neighborhood home (13 of the 25 shells, alternating in `COMMUNITY_HOMES` order and skipping the landmark 101 and the furnished 139: 103, 107, 112 and 116 Maple Grove Lane, 119, 123, 128 and 132 Cedar Run, 135, 142 and 146 Willow Way, 201 and 205 Maple Street) gets the owner-supplied "Full set rosa" living room: sectional with chaise and cushions, blanket, armchair, marble coffee table with decor, end table with lamp, side table and patterned rug. `assets/sofa-sets.js` places it against the right-hand (non-garage) wall facing the street, 1.7 m clear of the front wall, and adds six `community-furniture` colliders measured per piece (rug excluded) from the first frame. The model streams afterwards through the KTX2-aware GLTF loader and is cloned (shared geometry and materials) into each house; sets more than 34 m from the player are hidden. `assets/sofa-set/rosa-living.glb` is 2.4 MB and 38,882 triangles (source FBX 973,287 triangles and 191 MB, not stored); rebuild with `tools/prepare-sofa-set.mjs`, which also writes the piece boxes to `assets/sofa-set/layout.json`. The sets have no sit or interaction points yet.

Fire extinguishers (merged, PR #65): the owner-supplied wall-bracket extinguisher hangs in 11 places: the kitchen and utility garage of 101 Maple Grove, the kitchen and garage of 139 Willow Way, beside the Maple Cafe and Maple Bakery counters, on the Thread & Sole back wall, on the Maple Fire & Rescue facade between the bays, and on the pier between the two Flamingo elevators on each of its three floors. `assets/fire-extinguishers.js` lists the spots as a wall point plus outward normal, mounts the bracket flush with its bottom 0.65 m above the floor (top 1.21 m), draws only units within 30 m on the player's floor and offers a "Fire extinguisher · fire safety" prompt within 1.7 m. The panel teaches kids to get out, stay out, tell an adult and call 911 from outside, and gives the adult PASS steps and the gauge/tag check. `assets/safety/fire-extinguisher.glb` is 136 KB, about 6,100 triangles, untextured, with seven materials assigned per connected part by `tools/prepare-fire-extinguisher.mjs` (the source FBX has one grey material). The units have no collider; they stick out 18 cm from the wall.

### Street and landscape rules

Shared subdivision layout defines the same driveways/roads used by physics/navigation. Forest terrain and legacy trees respect developed land. Original west-road stubs were removed; curbs/sidewalks preserve neighborhood connections. Twelve inter-lot gaps are landscaped rather than left road-like. Eight existing-fleet cars fit whole footprints in selected drives, preserving the second bay and front walk. Cars were appended without reordering existing save IDs. Fences include open gates; do not close access accidentally when changing lots.

## Economy and persistent life

### Businesses, plans and earning

Four businesses: Saturday market, small restaurant, neighborhood store and neighborhood-help/service business. Each has a location, startup/supply plans and customer task. Market activity teaches bills/coins and change; restaurant, store and service customers ask generated learning questions (see Learning layer below). Customer templates safely cycle over longer queues. Each completed order pays once, including zero-change sales.

Business days continue beyond the tutorial. Morning stories cycle through a street fair, supplier prices, equipment repairs, rain and new neighbors. Quotes show costs, sale price, customers, revenue and profit before paying. Upgrades add two customers; repairs can add one and change later repair stories. Chosen plans do not reroll just by reopening menus. The latest 20 day results are kept. Garden returns mature when the promised business day starts, not on a menu preview. A day off records zero sales/costs.

My city plan reserves wallet money for supplies, home/bills, car care, treats and unexpected needs. Reservations are labels over existing wallet cash, not extra balances. Matching expenses reduce their own reservation first. If a purchase leaves other plans short, the player can wait or deliberately accept the shortfall; the journal records the choice. Goal changes preserve savings. Startup grants are one-time; startup supplies use actual available cash. Optional neighbor work offers a $2 recovery path after a completed day; first-shift clothing/job-board work also exists. Preserve each job's eligibility and one-time protections rather than treating every $2 reward as interchangeable.

Courier contracts are nearby on-foot pickup and explicit handoff: Maple Bakery → Cafe ($1.25), Cafe → Northstar Motors ($3.25), Bakery → Flamingo ($3.75). One active contract, free cancellation, no deposit/deadline/penalty, one reward per contract per business day. Parcel, phase, receipts and side-job earnings persist. Choosing another route does not cancel the job. Rewards enter wallet cash, not goal savings or business sales.

### Learning layer: adaptive skills, Garden Club and Parents page

Status: merged to main in PR #50; not verified as published to the private Site. Owner-approved design: a living design doc ("My City, My Choices: Learning Design") covering an adaptive 6 to 12 age band, a skills map, a mastery model, the Garden Club redo and a parent progress view.

- **Skills.** `assets/learning/` defines 12 skills (coin values, counting money, making change, adding prices, affordability, business profit, saving for a goal, budgeting, risk, borrowing cost, reading for detail, time and order), each with five levels. Generators are pure and seeded by the save's `childId`, so reloads do not reroll a question. Options are shuffled with distractors from common mistakes; hint 1 never states the answer. All learning strings live in `content.en.js` so a Spanish file can follow.
- **Tiers.** Sprout 6 to 7, Builder 8 to 9, Planner 10 to 12, chosen from the child's age on the welcome screen (grown-up section with optional 4-digit PIN). Planner types numeric answers; younger tiers choose. Saves without learning data default to Builder.
- **Placement.** On first launch Mom's wallet lesson becomes three warm-up questions (coins, change, prices). Results nudge starting levels and may suggest a tier on the Parents page; the tier changes only when a parent switches it (owner decision).
- **Mastery.** Three first-try answers raise a skill's level; two misses lower it and show a worked example next time. Mastered = 4 of the last 5 first-try correct at the tier target level (Sprout 2, Builder 3, Planner 4). Mastered skills return to Needs review after two misses or seven in-game days; two first-try answers restore them. Hint ladder: strategy hint, partial work, then the worked solution which the child enters. Mistakes never block story progress.
- **Customers.** Restaurant/store/service customers ask a question picked from that business's skill pool, weakest skill first (about 70% practice, 30% review). The market stall keeps the coin tray; the customer's payment scales with the change level (from the next quarter up to a $20 bill), and $5/$10 bills joined the tray. Story price, earnings and costs are unchanged.
- **Garden Club.** Replaces the one-coin-flip investment with three pretend plans: Seed Jar (+2% always), Steady Garden (70%: +6%, 30%: −3%) and Weather Garden (50%: +30%, 50%: −20%). Kids run 20-season test charts before choosing, answer a `risk.choose` question (Builder+), commit $1 for five seasons that settle when the next business day starts, then answer a reflection question. Legacy `patient`/`weather` investments still settle with their original payouts.
- **Parents page.** City menu → Parents, behind the PIN when set (SHA-256 with the child id). Shows tier, questions answered, first-try rate, each skill's status/level, stuck skills with the missed question and a try-at-home prompt, money choices and settings (age, tier, skill reset, PIN, progress export via the existing save download).
- **Not done.** No Spanish file, read-aloud, play-time tracking or cloud/parent account sync yet. Story money is now tier-scaled (next section).

### Tier-scaled story money

Status: implemented on branch `tier-economy` and proposed for merge; not published to the Site. Owner decisions (2026-10-22): a price sheet per tier (not one flat multiplier), the same days-to-goal pacing in every tier, all four Planner systems (paycheck with tax, savings interest, loan interest, monthly bills), Builder gets bigger numbers plus savings interest only, and a parent's tier change converts balances so progress carries over. Read-aloud was explicitly declined.

- **Where money lives.** `assets/economy.js` holds the tier tables. Module catalogues (cars, clothes, food, courier pay, home projects, business-day events) keep their original values, which are Sprout money, and scale them through `scaled(cents, category)` at the active tier. The entry point writes every original amount as Sprout dollars through `S(d)` (`usS` and `usd` format it), so Sprout output is unchanged.
- **Categories.** Factors by Sprout/Builder/Planner: core 1/10/100 (start wallet, goals, supplies, sale prices, restock, upgrades, neighbor job, first shift, Garden Club, plan steps); rent 1/10/150; home projects 1/10/100; clothes 1/10/15; food 1/3/4; courier 1/10/20; car price 1/10/1000; fuel 1/10/25; service 1/10/100. Planner housing is its own table: $25,000 price, $1,000 down, $500 installments, and loan interest. Tests keep goals and business pacing identical and rent and down payment within twice the original pace.
- **Planner examples.** $500 start, $300 starter supplies, $100 per sale, $200 restock, $600 bike goal, $300/week rent, $4,000 or $6,000 cars, $50 fuel fills, $30 to $60 clothes, $25 to $75 deliveries.
- **Weekly money.** `assets/money-life.js` runs at each new in-game week (every seven business days, when a business day starts, next to the Garden result). Savings interest: Builder 2% and Planner 1% per week. Planner only: courier pay waits for payday with 10% tax withheld and a pay stub; the home loan grows 0.5% and a car loan 1% per week; phone ($50) and, when housed, utilities ($150) bills arrive every fourth week. Bills and loan payments are always by choice; nothing adds late fees or pays automatically. Neighbor-job pay stays immediate in every tier because it is the restock recovery path. Rates are larger than real ones on purpose so the change is visible.
- **UI.** My city plan gains a "This week’s money" section (interest, waiting pay, tax, loans, last pay stub) and bill buttons. Maple Motors computes its comparison table, and Planner can pay 20% down and borrow the rest, with loan payments in the garage. Housing shows tier rent, price, installments and interest. The change tray, customer payments, plan steps and Garden Club stake follow the tier. The Parents page explains the money scale.
- **Learning questions.** `generateQuestion(..., {moneyUnit})` renders money skills (prices, afford, profit, saving, budget, risk, borrowing, reading) at the tier's core factor. Coin, change and time skills stay unscaled. The generators are linear in money, so tests prove every scaled question equals the original at ×10 and ×100.
- **Not done.** No real-world rate accuracy, credit scores or late fees by design. Planner tax is a flat pretend 10%. The story journal keeps old entries in the amounts they were written in.

### Shops, food and cars

Thread & Sole has 14 catalogue items across tops, trousers, shoes, hats and backpacks. Basket review, exact-cent costs, duplicate/affordability checks and receipts protect purchases. My wardrobe equips owned pieces free, removes accessories and restores original outfits; appearance updates on the real avatar.

Cafe NPCs have separate wallets, queue, pay, wait while the cashier prepares orders, collect food, occupy seats, consume and leave. Player tickets join paid service and survive saves with preparation time/receipts. Collection cannot charge or fulfill twice. NPC register income does not enter the player's wallet. Bakery orders use the existing food system; do not assume all café simulation behavior exists in every shop.

Maple Motors offers fictional used/refreshed coupes ($4/$6), fuel/service and an owned Mustang while free loaners remain available. Driving consumes fuel/condition; warnings and service affect handling/pace. An empty tank stops the engine. Fuel/service payments use wallet cash and transport plans. Roadside recovery relocates without gifting fuel, condition or money. Crash recovery is a separate free release of old disabled states, not a general upkeep refund.

### Housing, improvements and daily review

Rent/buy becomes available after business day two. Tours remain free. All prices below are fictional learning prices in Sprout money; Builder multiplies them by 10, and Planner uses $300/week rent, a $25,000 home ($1,000 down, $500 installments, 0.5% weekly loan interest) and ×100 projects (see Tier-scaled story money):

| Action | Price / effect | Constraints |
| --- | --- | --- |
| Rent / renew | $2 for seven business days including signing day | Explicit choice; no auto-renewal, late fees or automatic eviction |
| Buy | $5 down + five optional $1 installments | Existing remaining debt/payments preserved; owner cannot switch to renting accidentally |
| Ocean blue textiles | $1 | One-time actual rug/sofa/bedding change; unlocks three free textile styles |
| Backyard container garden | $1.50 | One-time three terracotta planters |
| Upstairs study | $1.25 | One-time books/plant on actual desk |
| Daily review | Free, optional, once per business day | Must be inside; reports results/earnings/savings/upcoming plans; no reward, deduction or auto-time advance |

`home-life.js` assigns the local story to `maple-grove-1`. Legacy paid rent/purchase migrates without charging again; an old rental gets seven days from its saved business day. Buying retains projects and does not credit prior rent toward the purchase. Project quotes use cents and reject stale, canceled, repeated or unaffordable confirmation; preserve planned-spending review, business profit and protected savings.

**Home & daily life → Make it your own → Find your home’s colors** offers Ocean blue, Garden sage and Warm clay, with three labeled color samples per style matching the actual rug, sofa/main-bed duvet and guest-bed duvet. The existing `textiles` project still costs 100 cents once and initially installs the original ocean/neutral appearance. Owning that project unlocks unlimited free restyles. Selection saves immediately, refreshes the selected state and changes existing materials; no placement editing or new furnishings are implied. All three options can be inspected before purchase but remain disabled until eligible. Styling requires an active rental/ownership, completed business stage and being out of vehicles, matching project-install eligibility. It can be planned away from home. Expired rental preserves installed appearance and palette, while renewal restores editing. Repeated selection is idempotent; no wallet, savings, debt, business-day, spending or journal changes occur.

`TEXTILE_STYLES`, `textileStyle()` and `restyleHome()` share the whitelist between UI, restoration and scene application. `applyLiving()` now keys its cache by palette too; a separate plaque cache avoids a welcome-texture upload on restyle. Rug/fabric/guest-bed material objects and all geometry/collision are reused. Existing project IDs/prices and their purchase review remain unchanged.

Help me settle in is optional and persisted: `idle → arrive → wardrobe → rest → review → done`, with a separate pause flag. Nearby real entry/upper-floor/bed actions advance it in order; remote or out-of-order calls cannot skip steps. Existing business/customer objectives take priority. Resuming away from home routes back; expired rental pauses eligibility until renewal. A review already completed that business day can still finish the guide without a duplicate journal entry. Do not replace this with automatic overnight rent or an unrequested needs/energy grind.

## Movement, vehicles and traffic

- Walking is camera-relative on keyboard/touch. NPC facing follows actual travel; earlier backward walking and Mom interaction triggers were explicit bugs, not intended behavior.
- Jumping uses bounded vertical integration with takeoff, gravity, landing, falling and teleport resets. Held jump cannot double-jump; horizontal collision still applies. Seated/mounted/elevator motion detaches appropriately.
- Rigged child/adult characters use preserved native proportions, retargeted idle/walk/run, separate skeletons and calibrated foot contact after animation. Seated/riding/resting poses must not be overwritten by ground correction.
- Cars have normalized scale, independent wheels/steering, progressive pedals, reverse delay, grip-limited braking/cornering, drag and grade response with fixed substeps. It is assisted game handling, not a tire/suspension or damage simulator.
- Fleet: Mustang, Mercedes-Benz GLS and McLaren Senna; deterministic 12-color variation. Base 50 civilian slots historically used 20 Mustangs/20 SUVs/10 McLarens; additional rush/driveway pools are separate. Police livery stays distinct. Shared near/mid/far geometry and per-device limits preserve model diversity when downloads fail.
- Eight free bicycles/motorcycles have steering/wheel/pedal animation, grips/saddle/peg IK and automatic helmets. Assisted balance, no full fall/manual clutch/countersteering simulation. Motorcycle uses six automatic gears with wheel-linked RPM, shift hysteresis and brief torque interruption.
- CPU traffic observes signals/STOP signs, clear junction exits, queues and same-level pedestrians. Swept movement prevents sudden step-out clipping; crossings wait for oriented vehicle clearance and finish after WALK changes. Ordinary traffic guards do not make player/emergency driving automatically safe.
- Rush-hour demand follows the displayed city clock: fictional weekday ramps 6:30–10 AM / 3:30–7:30 PM, later weekends and Sunshore evenings. Reserve pools add at most 24 cars desktop / 12 mobile. Spawns/wraps check clearance and distance; inactive cars must not leave blockers.
- Queue horns are distance/stereo aware and cooldown limited; signal/pedestrian waiting is not an excuse to honk continuously. Manual H / Horn / Bell has its own cooldown and respects gesture/audio gates.
- Crashes stop at the last safe pose, permit forward/reverse and dispatch a cruiser; no forced payment/tow/disabled engine lock. Reports deduplicate, police travel actual roads, inspect and return. Old saved disabled vehicles recover free.
- Navigation uses connected road/sidewalk graphs, spatial obstacle indexing and bounded local searches. Bridge-only river crossing, driving-to-parking then walking-to-door, saved destinations, rerouting/wrong-way cues and hotel-lobby guidance are supported. It is guidance, not autopilot or a live-clearance guarantee.

## Rendering, sound and interaction

### Graphics and asset direction

Three.js 0.180.0 is pinned; browser import maps load Three/add-ons from jsDelivr. Native tests use the matching npm dev dependency. The runtime is buildless HTML/ES modules, not React, Unreal or a server framework. Original procedural textures supply color/normal/roughness/occlusion for asphalt, concrete, brick, stone, stucco, siding, roofs and wood. World-meter UVs account for instanced transforms. Physical sky/environment, local sun shadows, window details, canopies, natural palms and geographically culled architectural batches add richness.

City surfaces (merged, PR #53): once loaded, `assets/city-scans.js` swaps the shared procedural maps of all eight PBR kinds (asphalt, concrete, brick, stone, stucco, roof, siding, wood) for CC0 Poly Haven scans, so every community home, road and downtown facade upgrades at once. Each scan ships as a grayscale tone map with the procedural maps' average brightness, so per-building paint colors and the existing palette stay the same. Siding is a quarter-turned board scan; roof, brick and siding roughness is scaled toward matte because the raw scans mirror the sky at grazing angles. Scans the house already ships share their normal/roughness files and one decoded copy. Extra download is about 2.5 MB on desktop and 0.75 MB on phones; rebuild with `tools/prepare-city-textures.mjs`. The per-house light bake stays house-only.

Lawns (merged, PR #57): grass is now the ninth shared PBR kind (`SURFACE_PROFILES.grass`, procedural fallback) instead of a separate canvas texture, and upgrades to a tone map of Poly Haven `leafy_grass` (2 m repeat, about 0.66 MB desktop / 0.2 MB phone). Kinds with a `macro` profile (only grass) add an anti-tiling second sample of the same map, rotated and about 3.4x larger, plus low-frequency greener and drier patches in world space, so wide lawns do not show a repeat grid. Existing metre-scaled grass UVs in geometry are now ignored by the shader's world UVs, without visual change.

Shrubs (merged, PR #58): `assets/shrubs.js` builds foliage the game way: 72 leaf-cluster cards (48 on phones) on an ellipsoid shell with outward normals and inner darkening, around an opaque core, normalized to exactly 2 × 1.6 × 2 m. One alpha-tested, double-sided material uses a canvas-drawn 2×2 leaf atlas; three geometry variants draw as instanced meshes (capacity 640 each) with per-shrub hue and brightness. `visualKit.shrub(x,y,z,{width,height,tint})` creates the field on first use; `planned-community.js` (lot pockets, front beds) and `community-plaza.js` (planters) use it and fall back to the old spheres only when a kit lacks it (test fixtures). 148 shrubs, 224 triangles each. Trees are unchanged: Poly Haven trees are millions of polygons, and its shrub scans are sparse wild plants unsuited to foundation beds.

Foliage wind (proposed): `assets/foliage-wind.js` holds one shared time and strength uniform. `addFoliageWind` patches tree canopy materials (free cards, 7 cm) and the shrub material (rooted: sway grows with height, 6 cm), phase-offset by each plant's world position, with a slow sway, a faster secondary sway and a leaf flutter. `index.html` advances it every frame with `weather.intensity`: 0.45 in clear weather, easing to 1.3 in heavy rain; long frame gaps advance at most 0.25 s. Palms keep their own sway. Shadows do not sway (the depth pass is not patched).

The furnished house is the first place using scanned materials and baked light. Rebuild its assets with the three tools in `tools/` (`prepare-house-textures.mjs`, `prepare-house-furniture.mjs`, `bake-house-light.mjs`); their npm dependencies are installed with `--no-save` and are not project dependencies. Rebake whenever house geometry changes: `tests/house-realism.test.mjs` fails when the bake signature no longer matches the atlas layout. A full bake takes about 14 minutes on two cores. KTX2 decoding loads the Basis transcoder from jsDelivr, like Three itself. The original full-detail house asset download was about 7.3 MB desktop / 4.1 MB phone; the mobile candidate now omits the six optional furniture GLBs. Mobile retains the already-created procedural beds, sofas, dining set, kitchen and other furnishings, both floors, stairs, colliders and all household actions. Desktop still installs detailed replacements. Neighborhood supplied sofa sets remain on both devices.

City scans, house maps and neighborhood sofas use one shared KTX2 loader, capped at one worker on mobile and two on desktop. City/house scan promises are memoized together; all scan/bake jobs settle before model loading and the decoder is disposed in `finally` after the last model job. Partial scan, bake or model failures retain fallbacks and do not prevent independent jobs. This releases decoder workers/WASM resources, not the textures and models still used by the scene.

101 entry stability: mobile/coarse-pointer devices use the existing baked/environment lighting without activating the two extra room point lights. Saved switches still control the fixture appearance and persist normally. Desktop keeps both room lights registered and changes intensity only; entering, changing floors or switching a light no longer changes the house's visible light count. Character indoor shading is attached on first appearance, before the actor's first render, so crossing the threshold updates a uniform without invalidating materials. Door collision matrices update only while a leaf changes angle or restore explicitly requests synchronization, snapping the final tiny angular remainder. Furnishings, geometry, atlas signature, collision, stairs and actions are retained. These remove verified rendering/CPU pressure paths, but do not establish the exact cause of an iOS browser-process crash without device logs or a successful device retest.

Cinematic uses EffectComposer, optional GTAO, restrained HDR bloom, grading, OutputPass and FXAA. Smooth removes contact shading; Basic renders directly. Mobile/coarse-pointer visits now start in Basic even with a saved Smooth/Cinematic preference, avoiding composer/HDR/bloom targets before the first frame. The settings UI reflects Basic; saved preference data is not overwritten at boot, wetness is retained, and players can explicitly raise quality for the session. Each mobile reload starts Basic again. Desktop restores its existing preference/default unchanged. Phones also avoid unused AO allocation when manually enabling effects. Sustained slow frames reduce effects/resolution; render failure falls back. Physical-pixel caps prevent Retina/large screens from allocating oversized targets. Disabling effects disposes their targets. Neighborhood instancing historically reduced measured geometry/instance buffers by about 71% (13,771,288 → 4,002,976 bytes), not total GPU memory.

The camera checks a padded swept path against actual architecture bounds captured before batching, rechecks smoothed travel, limits terrain/ceilings and resets on teleports. Steady/Cinematic and Close/Standard/Wide settings persist separately. Do not collapse an entire building into one camera box that blocks real doorways. Moving house doors are excluded from stale static camera snapshots; physical player collision still follows them.

Local clock/sunset, held Day/Sunset/Night views and street/window/headlight behavior exist. Weather offers manual road conditions, Clear, Rain and Heavy rain with gradual intensity, road wetting/drying, overcast lighting and an optional streak effect. Rain uses one bounded line pool (240 mobile / 700 desktop) and an indexed roof-shelter lookup. Wet traffic slows, increases following gaps/waits, looks farther ahead when braking and checks downstream clearance without deleting traffic density. Weather owns road wetness only outside manual mode; pause, local-sky preferences and temporary reflection captures retain their separate contracts.

Mobile budgets cap procedural texture anisotropy at 2, use 512-pixel scanned surfaces (grass included) and 512-pixel sun shadows, and reuse the sky environment rather than allocating a six-face HDR car reflection probe. These reduce allocation pressure; they do not prove the reported device crash is fixed. Graphics context restoration can request one Basic-mode reload, with a session-scoped two-minute cooldown against reload loops and a manual recovery action retained.

People and pets (merged, PR #54): `assets/character-roster.js` lists every model. Background townspeople ask for `crowd`/`crowd-child` and draw deterministically from 12 adult and 2 child Rocketbox avatars converted from the original FBX (`assets/characters/crowd/`, about 7.4 MB, all loaded once at least one of each is used). Story NPCs, the player, police, firefighters and customizable outfit wearers keep the original six because the outfit color masks fit only those UVs. All models carry a roughness map derived from the Rocketbox specular scans. Pets (`assets/pets.js`, Quaternius CC0 low-poly dog and cat, about 250 KB) wander in seven fenced backyards, four front lawns and the Commons lawn (clear of the play structure), and one dog follows a crossing pedestrian; they have no collision, interaction or saved state. Rebuild with `tools/prepare-characters.mjs` (needs a blob-filtered sparse Rocketbox clone and FBX2glTF) and `tools/prepare-pets.mjs`.

Crowd life (merged, PR #55): `assets/crowd-life.js` schedules what standing crowd NPCs do. Loners cycle idle, look around, text (a phone prop appears in the right hand) and wait; `conversation(x,z)` in `index.html` places two crowd NPCs facing each other who alternate talking and listening on a shared beat (downtown, outside the Maple Cafe, Maple Commons). Seven Rocketbox clips per animation set (1.3 MB total) load lazily per set and only rotations plus root motion are kept (`tools/prepare-motions.mjs`). Phones cap the crowd at 6 adults and 2 kids via `crowdLimit`; the pool alternates women and men so the cap stays mixed. Story NPCs, uniforms, seated, resting, riding and café-activity characters are unaffected by the standing schedule.

Seated life (merged, PR #56): every seated character (player, Commons crowd, café customers, house seats) plays one of four Rocketbox chair idles (`SEATED_MOTIONS`, 350 KB, loaded per animation set the first time someone of that set sits). The clip drives the upper body only; `seatedPose` still lifts the pelvis to seat height + 4 cm and now fits each leg with two-bone IK so the foot lands on the floor in front of the seat with the knee forward (the clips assume a taller chair, so their own legs sank through the floor). Children whose legs are too short reach toward the floor and dangle. Café sip/eat arm poses still apply on top. Resting on beds and riding are unchanged.

Character assets are six self-hosted textured Microsoft Rocketbox variants and compatible animation clips with notices in `assets/characters/`. Detailed GLS/Senna browser assets derive from owner-supplied Blender files lacking external textures; runtime materials replace them. Keep provenance/license notices; supplied assets do not automatically grant unrelated redistribution rights. Premium vehicle source preparation lives in `tools/prepare-premium-vehicles.py` and `assets/vehicles/README.md`. Existing visual captures in `docs/visuals/` are historical asset/software-rendering evidence, not a current full-device acceptance test.

### Audio

`city-audio.js` synthesizes original engine/RPM, rolling, bicycle chain, footsteps, surf, wind, café/crockery, pickup/collision and traffic/horn layers. Surface footsteps distinguish asphalt/concrete/grass/stone/sand/wood; airborne/seated/teleported/mounted movement does not emit walking steps. Web Audio initializes on user gesture, has saved master/category/mute settings, bounded continuous/one-shot allocations and graceful silent fallback. Menus/background pause world audio. No microphone, recorded speech or real engine recordings are required.

Spatial response sirens use bounded wail, distance attenuation within 160 meters, stereo/pitch variation, interior/vehicle filtering and a saved toggle. Arrival, return, missing/invalid responder, disabled audio and background pause silence/reset the response. Rain audio and sirens share the existing fixed-budget Web Audio mixer and cleanup; no recordings or new permission are needed. These systems are present in merged main and the hosted runtime; audible balance still needs real-device review.

The furnished Maple House now requests short original sounds after successful household actions: its six doors, switches/study lamp, fridge/oven/drawers, curtains, wardrobe, TV power/channel changes, tap/shower controls, washer, toilet/basin, seating, resting and making beds. Opening a bed/planning menu and rejected/remote actions remain silent. Explicit object-chooser actions may play feedback while the world is paused. A 120 ms audio-clock cooldown works independently of paused simulation time and shares the global eight-voice cap.

Running tap/shower water shares one fixed filtered-noise layer; the washer uses one fixed low triangle layer. `sampleHouseAudio` reads existing saved appliance flags and actual action positions, caches their source metadata per house, attenuates with distance/floor/closed room doors and computes stereo direction from camera yaw. The layers silence outside the house, in vehicles, in paused world updates, on background/mute, with Effects at zero or when Household sounds is off. They use the Effects bus. Short household voices are stopped/disconnected when disabled or backgrounded so returning does not replay an old click or flush. Restoring active appliances resumes their continuous state without replaying action sounds.

**Settings → Sound → Household sounds** is a saved boolean in the existing audio preference, defaulting on for older preferences while preserving master/category/mute levels. The mixer now has twelve fixed sources (ten prior city layers plus two household layers), reuses the existing noise buffer, and creates no per-frame audio nodes. Tests bound fixed nodes at 48 with stereo support; transient sounds still share eight voices. No recordings, speech, permissions, downloads, new scene geometry or new GPU targets are added. The synthesized textures and volume balance still require listening on physical devices.

## Architecture and source map

`index.html` owns the page/CSS/import map, scene construction and integration: story state, DOM panels, wallet/transaction handlers, nearby interactions, vehicles, collisions, save/restore, settings, maps and animation loop. Modules split rules and scene construction, but the entry module remains substantial. Tests sometimes extract actual functions/sections into VM fixtures; changing section boundaries can require updating those fixtures meaningfully.

| Files under `assets/` | Responsibility / related tests |
| --- | --- |
| `onboarding.js`, `onboarding.css` | Renderer-independent setup steps, goal catalogue/amount previews, validated saved-story discovery, readiness/failure and responsive/focus behavior; onboarding/story-flow tests |
| `first-steps.js`, `objective-markers.js` | First-story distance/action cues and camera-aware world markers; first-steps/objective-markers/story-flow tests |
| `world-rules.js` | District bounds, bridge/coast heights, roads, community lots and shared playable constraints; world/navigation/community tests |
| `north-world.js`, `coast-world.js`, `flamingo-hotel.js` | Northern/coastal construction, interiors, elevator and surface contracts; north/coast/bridge tests |
| `planned-community.js`, `residential-doors.js`, `community-addresses.js`, `community-plaza.js` | Lots, plaques, dynamic doors, address destinations, landscaping and plaza/playground; community/address/door tests |
| `house-rules.js`, `landmark-house.js`, `home-life.js` | Stable property state, multi-level geometry, reachable-object choices/state labels, household actions, tenure/projects/guide; landmark-house/house-interactions/home-life/story-flow tests |
| `city-scans.js`, `assets/city/` | Scanned city surface list, tone/normal/roughness file plan and shared-map upgrade; city-scans and city-materials tests |
| `house-surfaces.js`, `house-bake.js`, `house-furniture.js`, `assets/house/` | Scanned house materials and KTX2 loading, lightmap atlas/merge/shader hook and character probes, CC0 furniture fitting; house-realism tests |
| `house-guide.js` | Room/action directory, floor classification, location cues and SVG plans from actual household bounds; house-guide/story-flow tests |
| `house-audio.js` | Original action sound profiles and cached, position/floor/door-aware sampling of saved household sources; house-audio/city-audio/story-flow tests |
| `fire-extinguishers.js`, `assets/safety/` | Extinguisher spots and wall mounts, floor-aware drawing, nearest-unit prompt and the fire-safety lesson; fire-extinguishers tests |
| `sofa-sets.js`, `assets/sofa-set/` | Owner-supplied living-room set: every-other-home choice, house-local placement, piece colliders, streamed shared clones and distance culling; sofa-sets tests |
| `house-target-visuals.js` | Saved-guide approach marker, floor/range/occlusion visibility and reusable scene resources; house-target-visuals tests execute the actual frame integration |
| `city-rules.js`, `civic-world.js`, `cafe-activity.js`, `interior-visits.js` | Café/bakery/services, food tickets, NPC service/visitors and seats; city-life/cafe-service/local-life tests |
| `economy.js`, `money-life.js` | Tier money tables, conversion, formatting and change trays; weekly interest, payday, loans and bills; economy/story-flow tests |
| `business-days.js`, `money-planner.js`, `city-errands.js` | Morning quotes/results, reservations/transfers and work steps; business-days/money-planner/local-life/story-flow tests |
| `wardrobe.js`, `clothing-world.js` | Paid catalogue, owned outfits/avatar changes and store; wardrobe/story-flow tests |
| `courier-jobs.js`, `courier-visuals.js`, `city-navigation.js` | Delivery state/receipts, parcel/markers, road/sidewalk routing; courier-jobs/courier-visuals/city-navigation tests |
| `crowd-life.js` | Ambient and seated clip lists, loner/conversation/seated schedules, phone crowd limits; crowd-life and seated-life tests |
| `character-roster.js`, `pets.js`, `assets/characters/crowd/`, `assets/pets/` | Model roster, crowd picks, specular-to-roughness curve; pet wandering/following, yard and lawn spots, model fitting; people-pets tests |
| `characters.js`, `character-controls.js`, `character-grounding.js` | Asset/animation/IK, movement axes, jumping and contact; character-contact/controls/grounding/two-wheel-rider tests |
| `vehicles.js`, `vehicle-wheels.js`, `premium-vehicles.js`, `vehicle-fleet.js` | Vehicle assets/articulation/detail/reflections/fleet selection; vehicle-visuals/premium-vehicles/fleet-diversity tests |
| `vehicle-physics.js`, `vehicle-ownership.js`, `road-surfaces.js` | Handling/collision footprint, car ledger/upkeep, sampled road grip/grade; matching physics/ownership/road tests |
| `two-wheel-models.js`, `two-wheel-physics.js` | Ride construction/anchors/poses and bike/motorcycle dynamics; two-wheel-models/physics/rider tests |
| `traffic-signals.js`, `pedestrian-signals.js`, `traffic-safety.js`, `traffic-rhythm.js` | Signal cycles/meshes, yielding/crossing guards, city-time demand; traffic-flow/signals/safety/rhythm tests |
| `police-force.js`, `police-vehicles.js` | Officer roster/patrols, cruisers/livery/emergency lights; police-force/vehicle/story tests |
| `city-visuals.js`, `city-materials.js`, `city-atmosphere.js`, `architecture-detail.js`, `palm-trees.js` | PBR textures, terrain/trees/lighting and architecture detail; material/lighting/architecture/palm tests |
| `city-time.js`, `local-sky.js` | Displayed clock, presets, sun/night progression; city-lighting/local-life tests |
| `city-weather.js`, `rain-visuals.js`, `emergency-audio.js` | Weather persistence, wetness, indexed shelter, bounded rain rendering and spatial siren state; city-weather/emergency-audio tests |
| `cinematic-renderer.js`, `graphics-recovery.js` | Effects/pixel budgets/adaptation and context-loss/startup recovery; cinematic-renderer/graphics-recovery tests |
| `city-camera.js`, `camera-geometry.js` | Collision-aware camera, comfort settings and architecture snapshots; city-camera and native interior tests |
| `city-audio.js` | Procedural audio/mix/settings/voices; city-audio/story-flow tests |
| `touch-controls.js`, `session-lifecycle.js` | Pointer ownership/contextual controls, pause/background/resume; touch-controls/session-lifecycle tests |
| `learning/` (`skills.js`, `generators/*`, `mastery.js`, `session.js`, `garden-sim.js`, `parent-view.js`, `tiers.js`, `content.en.js`) | Seeded skill generators, tiers, mastery/placement, hint ladder, Garden Club simulation/chart and Parents page; learning-generators/learning-mastery/learning-garden-parent/story-flow tests |
| `save-backups.js` | Bounded import/export, primary/checkpoint/recovery writes and validation; save-backups/story-flow tests |

`scripts/check-source-parity.mjs` compares complete shipped inventories/hashes across the two layouts; `tests/source-parity.test.mjs` covers equal/missing/extra/changed files, binaries, invalid entry points, symlinks and CLI usage. `.github/workflows/game-tests.yml` runs the full Node suite on PRs and main pushes. It does not access the private Site or establish remote runtime parity automatically.

No backend database, account service, authoritative multiplayer server, cloud economy or payment processor is part of the audited game. Three is the only declared npm dev dependency. Preserve `.glb`, compressed model and material files when checking out or packaging; a text-only snapshot cannot pass asset-dependent checks.

## State, saves and compatibility

Primary local story key: `mapleStreetChapter1`. Story serialization includes stage/goal/business/day, wallet/savings/earnings/spending, journal, reservations, wardrobe, car ownership/pose, two-wheeler state, city activity/food service, errands, deliveries, navigation, player X/Z, avatar and house/home-life state. The merged learning layer adds `learning` (version 1: `childId`, `tier`, `age`, `placementDone`, `parentPinHash`, `tierSuggestion`, Garden reflections and per-skill level/status/streaks/last 8 attempts) and `gardenReflectionDue`; `restoreLearning` validates both, and saves without them load as Builder with every skill New. Multi-level house visit data restores upstairs correctly and recovers blocked saved resting positions to a clear landing. Read the current serializer for exact field shape before adding a field.

Optional `houseGuide: {targetId}` stores only a whitelisted furnished-object ID, independently from city navigation and settling progress. Old saves default to no target; invalid/removed/door IDs are dropped. The existing portable backup format carries it without a version change. Selecting, canceling and successfully using the target use normal story saves, and New story clears it. Tours and guidance are free; no ownership, wallet, savings or business-day change occurs.

Tier money adds `economy: {version: 1, tier}` and `moneyLife` (version 1: `lastWeek`, pending pay and the last 10 pay stubs, `carLoan`, `bills`, interest/tax/loan totals). `economy.tier` records which tier's money the stored amounts are in. Saves without it are read as Sprout amounts (all money before this change) and convert to the child's tier on load; older saves default to Builder, so their amounts multiply by 10. A saved `moneyLife` absent from old saves starts at the current week, so no interest is backdated. A Parents tier change converts every stored amount once (wallet, savings, plan reserves, business history, loans, receipts and car/clothes/food/courier totals), pays out waiting Planner pay in full when leaving Planner, and logs a journal entry.

`homeLife.textileStyle` is an optional whitelisted string (`ocean`, `sage`, `clay`), default `ocean`. It uses the existing home-life version 1 and portable save format. Missing/invalid values restore the original palette; non-owners and stories without the textile project discard any saved alternate selection. Legacy textile purchases are not charged again. Expired rentals retain their palette and project list. New story resets the field, and serializer/export/import already include the complete home-life object.

| Local key | Purpose |
| --- | --- |
| `mapleStreetChapter1` | Story progress |
| `mapleStreetCheckpointV1` | Earlier periodic autosave checkpoint |
| `mapleStreetRecoveryV1` | Story before an import/reset |
| `mapleStreetCityLight` | Clock/light preference |
| `mapleStreetGraphicsV1` | Picture/road conditions |
| `mapleStreetAudioV1` | Volume/mute, siren and household-sound options |
| `mapleStreetCameraV1` | Camera comfort/distance |
| `mapleStreetTrafficV1` | Demand/horn preference |
| `mapleStreetWeatherV1` | Weather mode and rain-streak preference |
| `mapleStreetHudV1` | Focus/HUD preference |

Save backups export a versioned file or accept legacy raw saves, with a preview before explicit Restore/reload/Continue. Device settings remain device-local, not in portable progress. Parsing is limited to 1 MB, with bounded depth/nodes/arrays/strings, supported versions/stages, validated numbers and refusal of markup/prototype keys. Character names must be escaped when displayed.

Import/reset recovery is separate from the periodic checkpoint. Failed recovery writes must not destroy a valid active story. Primary autosave can succeed even when checkpoint metadata hits quota. Read/import callbacks invalidate when panels close/change. After import/reset, old-page writes are suppressed to avoid overwriting replacement progress during pagehide. Export remains available when autosave fails. No device sync exists; file transfer is manual.

Hidden tab, blur, pagehide or supported freeze pauses input/simulation/render and flushes an active story once per away transition. Return preserves existing panels or shows compact Resume, without replacing the welcome screen. Graphics context loss similarly pauses and checkpoints before manual Basic reload or a rate-limited reload on context restoration. An OS killing a process without lifecycle events can still lose recent progress; never promise guaranteed recovery.

## Development and delivery

### Run the GitHub version

```sh
npm ci
python3 -m http.server 8000
# Open http://localhost:8000 in a WebGL 2-capable browser.
npm test
```

Node's built-in runner executes `tests/*.test.mjs`; no production build step is required. Browser Three/add-ons require internet access to jsDelivr. Use the pinned dependency/lockfile. A server must serve correct MIME types and binary/compressed assets. `DecompressionStream` is used for compressed vehicle assets; vehicle preparation has its own documented Blender pipeline.

### Source and publication discipline

GitHub PRs and the owner-private Sites playtest are separate destinations. A merged PR does not prove publication, and a successful publication does not prove GitHub main contains that source. Record branch/head/base, exact checks and deployment outcome in the change entry. Never copy the Sites index over GitHub main without reviewing source differences; weather/sirens are a known example. Preserve changes from concurrent work.

When both checkouts are available, run `npm run check:parity -- /absolute/path/to/site-checkout` from the repository. It streams SHA-256 over root `index.html` and every recursive `assets/` file against the Site's `dist/` equivalents, reports missing/extra/changed paths and exits nonzero on drift. It is read-only, needs no credentials and ignores non-runtime files outside that tree. Review mismatches before publication; absence of a Site checkout means parity is unverified, not permission to overwrite it. CI tests the checker itself, not private hosted content.

For a requested runtime update, use the supported Sites source opening/credential/packaging/deployment workflow and preserve its audience. Do not store tokens, auth headers, user allowlists, temporary QA pages, scratch paths or diagnostic archives in this repository. A documentation-only PR does not require changing the hosted game.

`PREVIEW_SOURCE.md` links back to this guide and records the source/deployment distinction. README retains detailed chronological feature notes; its early “future work” statements can predate later home ownership. Update current summaries instead of treating historical paragraphs as an exact release manifest.

## Validation and known issues

### What the existing evidence establishes

- Fire extinguishers (merged as PR #65): all 119 Node test files pass (73 files). New `fire-extinguishers` coverage: GLB size, part materials, no textures, triangle range and red paint; 11 unique spots with unit wall normals, flush brackets, inward-facing fronts, safe mounting height and spots inside their buildings; 139's units hang on real wall colliders, clear of furniture and reachable; shared clones, hidden until loaded, other hotel floors hidden, floor-aware nearest prompt; lesson content and game wiring. A software-WebGL page built from the real house, community, civic, clothing and hotel modules rendered all 11 placements on their walls. A full-game headless load was still running at commit time. No GPU, device or Site parity check.
- Sofa sets (merged as PR #64): all 119 Node cases pass across 72 test files. New `sofa-sets` coverage: runtime layout matches the measured `layout.json`, triangle and size budgets, alternating home choice that skips 101 and 139, fit inside every chosen shell, one collider per piece with house heights, walk paths from the front door to the rear, the garage side and the coffee table, a solid sectional, shared-geometry install, hidden-until-loaded and distance culling, and game wiring. Community-only Chromium page with software WebGL rendered the set on a lawn and inside 103 Maple Grove Lane. Full-game headless load check was still running at commit time. No GPU, device or Site parity check.
- Foliage wind candidate: all 114 Node cases pass across 68 test files. New `foliage-wind` coverage: strength curve and easing, frame-gap clamp, shared uniforms, existing shader hooks preserved, rooted vs free variants and program keys, bounded displacement, shrub and canopy wiring, and the game loop call. A software-WebGL render pair at two wind times differs only on canopies and shrubs (0.9% of pixels). No full-game, GPU, device or Site parity check.
- Shrubs (merged as PR #58): all 113 Node cases pass across 67 test files. New `shrubs` coverage: deterministic geometry, exact size, base on the ground, sprite vs core UVs, outward normals, instanced field capacity, tint variation and metre scaling, community and plaza routing through the field with no ball shrubs left. Software-WebGL renders of a front bed and a street. No full-game, GPU, device or Site parity check.
- Lawns (merged as PR #57): all 112 Node cases pass across 66 test files. `city-scans` now also covers the grass kind (tile, anti-tiling and patch shader only on grass, the visuals kit routing grass through the shared PBR material) with desktop scans at 3.03 MB under a 3.4 MB budget. Software-WebGL renders of a backyard and an aerial street view with scans, and of the procedural fallback. No full-game, GPU, device or Site parity check.
- Seated life (merged as PR #56): all 112 Node cases pass across 66 test files. New `seated-life` coverage loads real Mom, two crowd men and the boy rigs with real clips (bitmap decoding mocked): seated clips load on sitting, pelvis stays at seat height, adult feet reach the floor and never sink, feet rest in front of the seat, all four gestures occur over time, and standing up leaves the seated clips. Software-WebGL renders of four people on a 0.45 m bench. No full-game, GPU, device or Site parity check.
- Crowd life (merged as PR #55): all 111 Node cases pass across 65 test files; the inline module passes `node --check`. New `crowd-life` coverage: loner schedule contents and determinism, partners never talking at once and swapping roles, clip files for both sets (rotation/root only, budgets), phone crowd cap and mix, crowd/uniform/story ambient defaults, shared conversation seed, and game wiring. Software-WebGL renders showed texting with the phone prop and a two-person conversation. No full-game, GPU, device or Site parity check.
- People and pets (merged as PR #54): all 110 Node cases pass across 64 test files; the inline module passes `node --check`. New `people-pets` coverage: roster pools and deterministic picks, child skeleton prefixes, roughness curve, every model's skeleton/head/roughness/alpha-tested hair, crowd size budget and credits, crowd resolution and uniform fallback, pet wandering bounds/rest/determinism, follow-the-owner, yard and lawn spots inside lots and off driveways, real model fit and facing, and game wiring. Character-only and community-only Chromium pages with software WebGL rendered all 19 models, walking crowd models, a yard dog and a lawn cat. No full-game render, GPU, device or Site parity check.
- City scans (merged as PR #53): all 109 Node cases pass across 63 test files; the inline module passes `node --check`. New `city-scans` coverage: every kind has a scan, KTX2 headers and budgets, attribution, upgrade across existing and later tints, tile and shader cache key, roughness scale with wetness, a failed kind keeping procedural maps, and one load per shared house file. A community-only Chromium page with software WebGL rendered street, close-up and aerial views before and after at 1280×720 and 390×844 with no page errors. The full game was not rendered; no GPU, device or Site parity check.
- House realism (merged as PR #52): all 108 Node cases pass across 62 test files. New `house-realism` coverage: material roles per face, atlas bounds and overlap, bake signature and PNG size, plausible light values (roof, wall, floor, under bed, ceiling), probe grid, character shading, KTX2 headers and download budgets, furniture budgets and fitting with unchanged colliders and seats, and camera boxes. A house-only Chromium page with software WebGL rendered exterior, living, kitchen and bedroom views at 1280×720 and 390×844 with no page errors. The full game was not rendered, and nothing ran on a GPU or physical device. Site parity is unverified.
- Tier-money candidate (merged as PR #51): all 107 Node cases pass across 61 test files. New coverage: tier tables, pacing bands, reversible conversion, formatting, change trays, weekly interest/payday/loans/bills, save round trips, every scaled skill × level × 200 seeds at ×10 and ×100, scaled market payments, and full Planner and Builder playthroughs through the real handlers (supplies, change tray, restock, rent and loan-backed purchase, weekly interest and bills, payday tax, financed car, parent conversion and legacy-save migration). The inline entry module passes `node --check`. The full game also loaded in headless Chromium (software rendering, three.js served locally): an 11-year-old's new story showed a $500 wallet, $300/$500 supply plans at $100/$125 per sale, a $600 bike goal, and the planner's weekly-money section with $25/$100 steps, with no page or console errors. Screenshots timed out under software WebGL, so visual layout and the phone width were not checked.
- PR #48 merged with main after PR #50 (marker, textile styles and learning layer together): all 91 Node cases pass across 59 test files; the inline entry module passes `node --check`. Not browser-, GPU-, device- or Site-parity-tested after the merge.
- Textile styling passes the current full native suite (71 cases across 56 repository files; 54 hosted-layout cases). New coverage exercises old/invalid/portable saves, rental boundaries, rejected and repeated choices, actual panel/action dispatch with zero wallet and unchanged savings/debt, real rug/sofa/both-bed colors and 3,000 changes with stable geometry/material/collision resources and no texture uploads. Existing house geometry remains 98 meshes / 11,742 triangles / 46,190 measured bytes. Isolated browser UI and final parity outcomes are recorded in the change entry; these are not a rendered 3D or physical-device acceptance claim.
- The house-marker candidate passes all 70 Node cases across 55 repository test files and all 53 hosted-layout cases, plus focused checks after the marker material/projection checks. PR #47 previously passed 69/69 and both GitHub workflows. The furnished house itself retains 98 meshes / 11,742 triangles / 46,190 measured geometry/instance bytes; the separate marker adds two meshes and 72 triangles. These figures exclude full-game GPU memory.
- Current browser startup again reaches the graphics-recovery dialog because WebGL cannot initialize. No rendered-marker acceptance is claimed. Native checks verify all 25 actual approaches, live door/wall/furniture occlusion, floor/ceiling/range gates, real frame integration, portrait/desktop mathematical projection, camera-snapshot exclusion, stable resources across 10,000 updates and disposal. Physical GPU/device inspection remains required.
- Browser Web Audio QA used a temporary page importing the shipped mixer: offline rendering produced a finite, nonzero door waveform; live context unlock accepted switch feedback after a click; disabling Household sounds refused it. The temporary page was removed before packaging. This establishes browser API/gesture/mute operation, not listening quality, spatial realism or physical-device sound balance.
- House-guide browser QA used a temporary isolated page with actual house data, guide handlers and shipped CSS: both floor plans, floor switching, selected marker, object selection and refreshed target rendered correctly at desktop and 390-pixel iframe widths. Temporary QA pages are removed before packaging. The known full-game WebGL limitation and physical-device acceptance remain unresolved.
- Browser QA used a temporary isolated page with the actual shipped house scene data, chooser handlers and CSS: curtain selection/state refresh rendered correctly at desktop and 390-pixel iframe widths. That page was removed before packaging. Full game startup still reaches the graphics-recovery dialog because this QA browser cannot initialize WebGL. This verifies the chooser layout/interaction, not a rendered walk through the house or physical touch hardware.
- PR #41 reported all 47 hosted-layout test files passing with original binary assets. Earlier counts were snapshots at their respective PRs, not a count to reuse forever.
- Native Three tests construct actual meshes, inspect finite geometry/budgets, check paths, camera bounds, collision footprints and surfaces. Character tests load real rigs/clips with bitmap decoding mocked where appropriate.
- Story-flow fixtures execute actual handlers with a simulated DOM: business, money, ownership, stale/duplicate actions, saves and newer home guide hooks. A passing simulated panel is not a rendered 3D playthrough.
- Past browser/asset captures have shown some features under software rendering. More recent QA environments repeatedly cannot create WebGL, reaching the recovery screen instead. Do not generalize a past asset screenshot to a current full-game visual pass.
- Reported initial game crash/glitch and later mobile graphics error motivate the graphics recovery/memory work. No physical-device crash cause has been conclusively established here.

### Open issues / deliberate limitations

| Item | Status and next action |
| --- | --- |
| Doors do not open / no interaction guidance reported in a related project chat | Neighborhood front/patio/garage doors now animate with collision and addressed prompts; mobile CSS no longer hides the prompt. Native/UI checks pass; reproduce/confirm on the reporting device before claiming device-specific resolution |
| Attractive addresses on every home's front wall | Implemented for all 27 homes with shared illuminated number/street atlas; native identity/orientation checks pass; physical-device readability remains unverified |
| Future runtime source drift | PR #44 resolved the observed weather/siren/mobile gap; rerun the read-only parity command against an available current Site checkout before future handoffs |
| PR #8 school/grocery/bus/Hudson/riverfront expansion | Historical merged PR describes these, but current main lacks its dedicated city-next test/module and several runtime identifiers; do not present the full package as currently playable without reconciliation |
| Full GPU/mobile acceptance | Still needed on actual iPhone/Safari and desktop; test first load, doors, stairs, shadows, frame stability, audio, touch, app switching and save recovery |
| Mobile page reload/close entering 101 Maple Grove | Owner confirms mobile-only failure persists after version 72 / PR #68. Current candidate starts mobile in Basic, keeps lighter furnished stand-ins and caps/releases one shared decoder pool. Actual loaded-bake threshold logic passed a native loop; the browser process failure is not reproduced or conclusively diagnosed. Requires the same saved-position iPhone/iPad retest; desktop visual defaults stay intact |
| Remaining homes/towers | 139 has furnished ground-floor rooms; 13 other shells have living-room sets and 12 remain empty downstairs. Only 101 has an accessible furnished upstairs; most towers remain scenery |
| Premium visuals | Procedural materials/assets are an improvement. Scanned surfaces cover the city (merged); baked light and real furniture exist only in 101 Maple Grove (merged). GTA-level fidelity, realistic people, ray tracing, destruction and production streaming are not implemented |
| House realism pilot | Needs a GPU and phone check of load time, frame rate, memory and texture quality; tune bake gamma/floor and wall colors by eye; faint wall seams remain; bake must be rerun after house geometry edits |
| Physics/camera | Assisted kinematic simulation and conservative architecture bounds; not full rigid-body realism or automatic safety around all dynamic vehicles |
| Persistence | Browser-local plus manual backups; no multiplayer authoritative state or cross-device automatic sync |
| Learning layer playtest | Merged in PR #50, not yet playtested. Simulated-DOM story flow and generator/mastery tests pass; needs a real playthrough at Sprout and Planner tiers, mobile layout checks of question/Garden/Parents panels, and tuning of level thresholds and hint wording |
| Tier money playtest | Merged in PR #51, not yet playtested. Needs a real Planner and Builder playthrough to check amounts read naturally, payday and bills feel fair, and phone layout of the planner money section and garage loan rows |
| Documentation gate | Checks that the context actually changes per commit; cannot judge semantic completeness. Merge blocking requires the repository owner to mark the workflow check required in branch protection/rulesets |

### Regression checklist for the next runtime edit

Run targeted tests first, then the appropriate full suite once inputs settle. Validate syntax of the inline module as well as edited ES modules. Inspect changed geometry/camera/door gaps with native fixtures. For economy changes cover cancel, stale quote, duplicate submit, exact cents, wallet vs savings, migration and restore. For world changes cover real vehicle/player footprints, door/seat exits and shared navigation data. For mobile/UI changes check portrait/landscape, multitouch ownership, contextual actions, Escape/focus and app switching. For rendering changes measure buffer/draw/pixel budgets and report GPU/device limits explicitly.

## Roadmap and unresolved scope

### Immediate, grounded in owner feedback

1. Learning and tier money are merged (PRs #50/#51): playtest Chapter 1 with one younger (Sprout) and one older (Planner) child, then tune thresholds, hints, weekly rates and Planner prices. Both are already in the private playtest; keep parity verified as new changes ship.
2. Review the house pilot, city scans and the new people/pets on a real desktop GPU and phone (load time, memory, frame rate). Decide whether to buy realistic animated pets.
3. Confirm the new neighborhood door/prompt behavior on the reporting device; the source now supports addressed Open/Close actions and visible mobile guidance. Do not declare a device-specific issue resolved solely from native tests.
4. Playtest exterior address readability, door animations, directory guidance and empty-shell entry at day/night and phone/desktop sizes. The 27 front-wall plaque and address-data pass is implemented.
5. Keep runtime parity verified as each destination changes; audit older lost/stale PR #8 expansion work before planning on top of those historical claims.
6. Complete device playtesting for startup/crash recovery, house entry/stairs/bed exits, mobile control visibility and scene performance.

### Next product work already requested or implied

Extend furnished-home depth and usable household interactions while protecting performance and clarity. Expand property assignment to multiple actual homes/players only with a deliberate state/ownership design. Preserve the existing local rent/purchase/projects and optional daily life rather than replacing them with automatic fees. More believable public spaces, businesses, residents, architecture and vehicles should serve the life-skills loop instead of adding disconnected scenery.

### Future decisions, not approved implementations

Multiplayer/accounts/cloud saves need an authoritative backend, ownership boundaries, migration, security and operating-cost decisions. A fuller housing market, free-placement construction/furniture editing, player-to-player trading, richer NPC schedules, advanced jobs, destruction and an Unreal/Rapier migration each need scope and acceptance criteria. No timeline, backend vendor or engine switch is committed by this document.

The browser prototype remains the active delivery path. If an engine evaluation is requested, compare visual/device targets, asset pipeline, networking, distribution, developer effort and save/economy migration before choosing. Do not install a framework just to satisfy an aspirational visual reference.

## Maintenance contract

This requirement comes directly from the owner: the context must be updated after every change.

1. **Before editing:** read this document and [AGENTS.md](AGENTS.md), check current main/active PRs, and distinguish reported plans from verified implementation.
2. **In each change commit:** update affected current-state sections, known issues/roadmap and a dated change entry below. This includes code, tests, assets, CI, settings, docs-only work, reverts and dependency updates. Explain what changed, why, impacted files, migration/behavior and actual validation/limits.
3. **Before handoff:** remove resolved items, mark pending/unpublished work accurately, record verification limits, and ensure README/source notes do not contradict the current guide. Do not fabricate tests or recover missing conversation details from guesses.
4. **Before committing:** stage the context with the change and run `node scripts/check-context.mjs --staged`. For a committed range, use `node scripts/check-context.mjs BASE_SHA HEAD_SHA`.
5. **CI:** `Project context / context-current` checks every commit in the PR or main push range. Any nonempty commit that fails to change `PROJECT_CONTEXT.md` meaningfully fails the job. Whitespace-only edits and deleting/emptying the context fail. The check tests presence of a real update, not its editorial correctness. Reviewers must verify the content. Configure it as required to block merges; this PR does not change repository administration settings.
6. **No automatic prose invention:** do not have CI append generic timestamps to make the gate green. Write the useful context update yourself. Follow-up fix commits must update context again. Human changes should follow the same rule as agent changes.
7. Keep the document focused on the project. Never include secrets, private family details, raw auth/session data or full chat transcripts unrelated to implementation. Preserve links to source/PR evidence and explicitly state uncertainty. Decisions and implementation consequences belong here; Git/PRs retain exhaustive line-level history.

### Entry template

```text
### YYYY-MM-DD — Change title
- Request / reason:
- Result and status (proposed, implemented, merged, published):
- Affected files / systems:
- State/save/migration or compatibility impact:
- Validation actually run and limitations:
- Remaining work / decisions:
```

## Change ledger and history

### 2026-10-23 — Reduce mobile house-entry memory after version 72

- Request / evidence: the owner reports that entering 101 still closes/reloads the page on iPhone/iPad, and explicitly confirms mobile-only impact. PR #68 is merged and Site version 72 published, but that mitigation was insufficient. No client crash log establishes a definitive root cause. Native execution with the real shipped bake loaded passed threshold movement, house updates, avatar shading, audio, nearby actions and camera updates.
- Implemented candidate: one shared KTX2 decoder for city/house scans and neighborhood sofas; mobile worker limit one, desktop two; wait for late scans and models before disposal in `finally`, including detection failure cleanup. Mobile skips the six optional landmark furniture GLBs and retains the fully furnished procedural models/actions. Desktop replacements and neighborhood sofa downloads remain. Each mobile boot restores Basic graphics even with a higher saved quality, preserving wetness and stored preference data; explicit session overrides still work. This is an intentional mobile visual tradeoff while device acceptance is open.
- Compatibility: no save schema/keys, wallet/savings, rent, ownership, household flags, floor/stair geometry, atlas signature, interaction positions or controls change. Continue uses existing saves. Previous stable-light/shader/door changes remain intact.
- Validation: focused decoder lifecycle, real composer controller and sofa checks pass; repository and hosted suites each pass 123/123 across 77 files. Lifecycle fixtures execute the actual shipped asynchronous boot code with mocked network/decoders: shared requests, delayed city/sofa jobs, partial asset failures, cleanup, worker caps, desktop installs and absence of mobile optional furniture requests. Graphics tests exercise mobile Basic startup/direct rendering, unchanged desktop restoration and manual mobile override. All 252 runtime files match across layouts; inline/edited-module syntax, staged context and whitespace checks pass. Exact PR/publication results belong in the handoff.
- Limits: this QA browser cannot create WebGL. These checks do not prove iOS process memory use, visual acceptance or crash resolution. Reload the private game and retest the same house/save on the reporting device before declaring resolution. Do not erase saves as a workaround.

### 2026-10-23 — Reduce rendering and CPU spikes at the landmark entrance

- Request / evidence: owner reports a crash when approaching 101 Maple Grove on iPhone/iPad. Site is version 71; its server error log query returns no errors, which does not diagnose client/GPU failure. Main through #67 and the Site runtime matched all 252 files before editing.
- Findings: room lights changed `visible` on entry/floor/switch boundaries, changing Three's light-count program definitions for lit materials; avatar indoor shaders were first patched after entering; all six idle doors walked the furnished root hierarchy and recomputed bounds every frame. These costs are verified in source; no iOS GPU/process crash was reproduced here.
- Implemented mitigation: pass the existing mobile graphics flag into the house. Mobile retains baked/ambient light and fixture switch feedback with no active room point lights; desktop retains a fixed two-light shader layout with intensity gating. Prepare avatar indoor shading on first appearance and change only its uniform on entry. Synchronize door bounds only during actual movement or restore, snapping a settled angle to its target.
- Compatibility: no save keys/schema, ownership, wallet/savings, household flags, geometry/lightmap atlas or furniture changes. Existing saved upstairs visits, switches and doors restore normally. Mobile room switches change fixture appearance; the dynamic room-light contribution is replaced by existing baked/environment light.
- Validation: repository and hosted suites pass 122/122 across 76 files. Focused house realism, entry-budget, interaction and geometry tests pass. New tests cover 100 repeated outside/downstairs/upstairs loops on each device mode, fixed visible light layout, zero mobile room-light contribution, switches/restores, finite collision bounds, moving/settled doors and zero idle root updates. Avatar tests cover 1,000 indoor/outdoor transitions with stable material version/program key. Complete parity, syntax, context and whitespace checks are required before packaging; final source/deployment outcomes belong in the handoff.
- Limits: this QA browser cannot run WebGL; native tests establish state and resource contracts, not iPhone crash resolution, GPU shader compilation time or visual light balance. Device retest at the same saved position is required. Preserve the private audience and player saves.

### 2026-10-23 — Reconcile the recent releases and guide the first objectives

- Request / reason: continue with the next useful work after reviewing the last ten PRs. The live private playtest was behind main, including fixes for the owner's blocked Start/Continue report; onboarding also ended with a static objective even when Mom was already reachable.
- Review: #57 scanned lawns, #58 leafy shrubs, #59 wind, #60 cursor/menu and 139, #61 onboarding, #62 pre-player conversation startup crash and lock explanations, #63 camera-aware markers, #64 supplied living-room sets, #65 fire extinguishers, #66 startup error classification and late-ready recovery. All ten are merged. The version-70 Site already held #57–61 and lacked #62–66.
- Result / status: implemented a presentation-only first-step guide for Mom and Maya, with rounded world direction/distance, actual nearby-target readiness, named desktop/touch actions and door/seat/vehicle hints. Reconciled the hosted entry point, onboarding, planned community and six new merged assets (including original GLBs/layout data), preserving all markers, loaders, safety actions and startup fixes. This is a candidate until the source/deployment result in the handoff; it does not assert an unobserved merge.
- Affected: `first-steps.js`, entry-point integration, new first-step tests, real story-handler tests, README/source/context; hosted checkout additionally receives merged #62–66 and layout-normalized tests. No new geometry, lights, textures, HUD widgets or runtime dependencies for the guide.
- Compatibility: no save format/keys, prices, rewards, ownership, player coordinates or transactions change. Guide state is derived each frame; existing Continue restores normally. Never replace or clear a player's save to work around startup. The actual crash in #62 was a temporal-dead-zone read of `player` during `conversation()` construction; its `openGround()` fix must stay independent of player state.
- Validation: repository and hosted-layout `npm test` each pass 121/121 across 75 files, including actual first-interaction/Maya integration, door precedence, paused updates, invalid stages/positions and unchanged serialized progress/money. The hosted suite now includes the context/parity checker cases as well as normalized runtime/asset paths. All 252 runtime files match; module/inline syntax and whitespace checks pass. Phone-width isolated browser QA uses the shipped objective CSS, cue/update function and real touch controls: named Mom/Maya actions, 95 m east cue and doorway priority pass. Temporary QA pages are removed. Full-game QA here cannot create WebGL; it reaches the explicit graphics error. Past software-WebGL evidence in #62/#66 is historical, not a fresh full-game pass. Staged/committed context checks and final source/deployment outcomes belong in the PR/handoff.
- Remaining: actual-device new-story/Continue acceptance, Sprout/Planner learning playtests, GPU/memory/audio tuning, sofa seating and shell interior lighting. Preserve the current private audience.

### 2026-10-23 — Setup no longer fails on errors that are not the game's

- Request / reason: owner hit "The city couldn’t finish loading" on step 3 of onboarding in the hosted playtest (the page shows an "Edit site" overlay), with a saved story waiting, so neither Continue nor Start could be used.
- Cause: `assets/onboarding.js` marked the city failed on any window `error` or `unhandledrejection` before ready, including errors from scripts that are not part of the game (the host's editing overlay, browser add-ons) and stray async rejections, and a later successful load never cleared it. The exact error on the owner's page was not available; GitHub main (with PRs #64 and #65) loads in headless Chromium with no page errors, both fresh and after reload with a saved story.
- Result and status: proposed on branch `city-load-errors`. New `ownScriptError(event,win)`: only an uncaught same-origin script error fails setup immediately. Other errors start a 20 s grace timer; the generic message appears only if the city is still not ready, and a later `city:ready` clears it. Specific setup errors stay.
- Affected files / systems: `assets/onboarding.js`, `tests/onboarding.test.mjs`.
- State/save/migration: none. Saved stories were never touched.
- Validation actually run: `npm test`; new onboarding cases for own vs foreign errors, rejections, the grace timer, ready cancelling it, late ready clearing the generic message and specific errors persisting. GitHub main (PRs #64 and #65) in headless Chromium with software WebGL: city ready in 62 s on a fresh load and 39 s after reloading with a saved story, with no page errors or unhandled rejections. No GPU, device or hosted Site check.
- Branch refresh: main (with PR #63, objective markers) was merged into `city-load-errors`; the only conflict was both 2026-10-23 ledger entries, and both are kept.
- Remaining work: if the hosted page still fails, the browser console's first error is needed; the hosted Site was not inspected or redeployed from here (parity unverified).

### 2026-10-23 — Objective markers no longer fill the screen

- Request / reason: owner asked to keep improving realism. A real full-game capture showed a large translucent green column over the middle of the screen at the start of every new story.
- Root cause: a new story places the camera behind the player at Mom's spot (0.3 m from her objective marker), so the view looked out through the marker's translucent beam.
- Result and status: merged as PR #63. New `assets/objective-markers.js`: every `marker()` keeps its ground ring, its beam fades in only between 4 m and 12 m from the camera (0.14 opacity at full), and a small bobbing arrow floats over the target, fading when the camera is within about 1.5 to 3.5 m of it. `index.html` updates all objective markers each frame after the camera and house-guide marker. Turning the starting camera toward Mom was tried and reverted: it placed the camera inside a nearby building.
- State/save/migration: none.
- Validation actually run: `npm test` 118/118 including new `tests/objective-markers.test.mjs`; inline module `node --check`; full game in headless Chromium with software WebGL, new story started in daylight: before, the column covered the view; after, the view is clear. No GPU or device check.
- Branch refresh: after PRs #64 (sofa sets) and #65 (fire extinguishers) merged, main was merged into `marker-fade`. The only code conflict was the frame loop in `index.html`; both calls are kept (`globalThis.fireExtinguishers?.update(player.position)` and `updateObjectiveMarkers(...)` after the house-target update). `npm test` passes on the merged branch.
- Remaining work: the start camera still sits on Mom's spot; a dedicated opening camera is a later option.

### 2026-10-23 — Fire extinguishers where they belong

- Request / reason: owner attached `fire_extinguisher_mid_poly_model.fbx` and asked to add fire extinguishers wherever it makes sense.
- Result and status: merged as PR #65. 11 wall-mounted units in the furnished homes' kitchens and garages, the café, bakery and clothing store, the fire station facade and every Flamingo elevator landing. Walking up to one shows a fire-safety lesson for kids (get out, tell an adult, call 911) with the adult PASS steps.
- Affected files / systems: new `assets/fire-extinguishers.js`, `assets/safety/fire-extinguisher.glb`, `tools/prepare-fire-extinguisher.mjs`, `tests/fire-extinguishers.test.mjs`; `index.html` (creates and streams the units, updates them per frame, adds the prompt and panel); README.
- Asset provenance: supplied by the owner in this conversation; the 442 KB source FBX is not committed. It had one untextured mesh, so the tool splits it into connected parts and assigns paint, rubber, strap, bracket, gauge, tag and chrome materials, then simplifies 12,983 to about 6,100 triangles.
- State/save/migration: none. The prompt has no saved state.
- Validation actually run: see the fire-extinguishers evidence entry under Validation.
- Remaining work: no collision on the units; the 25 empty neighborhood shells get none until they have rooms.

### 2026-10-23 — Sofa set in every other neighborhood home

- Request / reason: owner attached `Full_set_rosa_FBX_2.zip` and asked that every other house have this sofa set.
- Result and status: merged as PR #64. 13 of the 25 neighborhood shells (alternating, skipping the landmark 101 and the already furnished 139) show the set in the front living area, against the non-garage wall with the sofa facing the street. Six measured piece colliders exist from the first frame; the model streams in after load and is cloned into each house. Sets beyond 34 m are hidden.
- Affected files / systems: new `assets/sofa-sets.js`, `assets/sofa-set/rosa-living.glb` and `layout.json`, `tools/prepare-sofa-set.mjs`, `tests/sofa-sets.test.mjs`; `assets/planned-community.js` (creates the sets, exposes `sofaSets`, updates culling in `update`); `index.html` (streams the GLB through KTX2 + GLTF); README.
- Asset provenance: supplied by the owner in this conversation; the 191 MB source FBX is not committed. The tool converts it with FBX2glTF, fixes exported metal/mirror materials, merges by material, simplifies to 38,882 triangles (from 973,287) and compresses textures to KTX2 (1024 px sofa fabric and rug, 512 px others).
- State/save/migration: none. No interaction or seating on the sets yet.
- Validation actually run: see the sofa-sets evidence entry under Validation.
- Remaining work: sit points on the sectional and armchair; review interior lighting of the shells (the rug reads very dark indoors); GPU and phone memory/frame-rate check.

### 2026-10-22 — Fix startup crash that locked Start and Continue

- Request / reason: owner reported that "Continue saved story" and "Start exploring" could not be clicked after filling out setup.
- Root cause: PR #55 added `conversation(x,z)`, which placed each partner with `blocked()`. It runs while the world is built, before `const player` exists, and `blocked()` reads `player.position.y` for house floors, so the main module threw `ReferenceError: Cannot access 'player' before initialization`. Everything after that line never ran, including the final `cityReady` flag the onboarding (PR #61) waits for, so both buttons stayed disabled. The crash existed since PR #55 merged; `npm test` missed it because no test executes that part of the inline module.
- Result and status: fixed on branch `fix-startup-player` and proposed for merge. `conversation()` now uses `openGround(x,z)` (world walkability plus static obstacle boxes, no player). Step 3 of onboarding now states why Start is locked: city still loading, load failed, no goal, invalid PIN, or a saved story that needs "Start a new story" ticked.
- Affected files / systems: `index.html`, `assets/onboarding.js`, `tests/onboarding.test.mjs`.
- State/save/migration: none. Saved stories were never touched; they load again.
- Validation actually run: `npm test` 117/117; inline module `node --check`; full game loaded in headless Chromium with software WebGL: city ready in about 32 s with no page errors; new story starts; after reload Continue resumes the save; with a save present Start stays locked with the explanation until "Start a new story" is ticked. No GPU or physical-device check.
- Remaining work: the inline module still has no end-to-end load test in CI; the headless browser check above was run manually.

### 2026-10-22 — Make goal selection reliable and rebuild onboarding

- Request / cause: no way to choose a goal at startup; review the whole onboarding. Goal buttons were created deep in the main world module, so an earlier 3D/startup failure left the goal container empty. The long combined form also buried goals under customization and parent settings.
- Result: three focused screens with static goal cards, age-scaled targets, optional appearance/PIN, summary/first objective/controls, fixed Next/Back/Start footer, keyboard focus containment and phone/landscape styles. A renderer-independent module owns setup; world readiness/failure is explicit. Valid saves have a Continue card. Confirmed replacement keeps recovery first; failed recovery and duplicate Start are guarded.
- Affected: `index.html`, new `onboarding.js` / `onboarding.css`, new `onboarding.test.mjs`, actual start/continue/new-story story-flow coverage, README/source notes and this context. No new media, graphics allocations, saved schema, goal IDs or economy changes. Main baseline is merged PR #60 at `ab5efb1ac5439356244e92ba4341feed86952bee`; previous private Site version 69 is source `c1bf138d390ad6fa8c664ba6415233d036af8add`.
- Validation: repository 117/117 cases across 71 test files and hosted layout 100/100 cases pass, including real setup-controller navigation/loading/failure/PIN/save/focus behavior and actual game handlers for every prior story/economy path. New start checks cover selected draft/appearance, no-goal/invalid-PIN refusal, confirmed replacement, failed recovery preservation and duplicate calls. Browser checks on the actual startup page confirm goals remain selectable despite unavailable WebGL. A removed isolated ready-state page using shipped HTML/CSS/controller checks desktop and 390×844 phone steps, scaled amounts, selection, summary and enabled/reachable Start; this does not prove a rendered game start. Inline/module syntax, staged context-policy and whitespace checks pass; all 245 runtime files match across layouts.
- Delivery / limits: synchronize both runtime layouts, run hosted/syntax/context/whitespace/parity checks and publish to the existing owner-private Site. Final source/deployment/CI outcomes are in the handoff. GPU rendering, physical touch/keyboard and a real-device first-Mom playthrough remain acceptance items; this browser cannot initialize WebGL. Temporary QA pages are removed before packaging.

### 2026-10-22 — Separate cursor release from the menu and repair 139 Willow Way

- Request / reason: Escape opened the menu instead of reliably exposing the mouse, and 139 had no inner rooms/furnishings plus a flickering floor.
- Result / status: implemented in the candidate. P opens/toggles the city menu; Escape releases mouse/clears held input and closes a panel without recapture. P is ignored while typing, on repeat, with browser modifiers or at the welcome screen. Updated visible Menu button and keyboard help. 139 now has plaster-lined walls, separated guest bedroom/garage, living furniture/TV, kitchen/dining furniture/appliances and a workbench. Furniture is static scenery; existing door interactions remain, and upstairs stays closed.
- Cause / affected systems: the prior Escape listener intercepted the browser key, and `hide()` immediately requested capture again. Added an optional relock argument and unlock input reset. All 26 neighboring foundations also shared a 0.30 m top plane with their finished floor; lowered slab tops to 0.27 m without changing walking heights. Changed `index.html`, `planned-community.js`, new `menu-pointer.test.mjs` / `house139.test.mjs`, README/source notes and this context. Furnishings reuse static instance batches; no new texture downloads, lights or per-frame work.
- Compatibility / source: no save, economy, home identity or tenure changes. Main baseline is `9164760108e6bcc5c5c592f4f92b30c461078d38` through PR #59. The old private Site was version 68/source `7c02849485203d6588f04611e6c3b32091fc042a`; reconcile its runtime to main before applying this fix, including original binaries, to avoid dropping merged work. Site test paths are normalized to `dist/`; GitHub retains root paths. Historical ledger status statements above/below are snapshots, not claims that merged features are still pending.
- Validation: all 116 repository cases across 70 files and all 99 hosted-layout cases pass. Native regressions execute the actual shortcut/pointer/panel functions, preserve typing/browser shortcuts and stale-transaction invalidation, inspect real instanced floors across 26 houses, check stable 0.30 m footing, all 139 rooms/front/garage/patio paths, furniture collision and full-height camera wall coverage. Existing 79-door/27-address and story/economy suites pass. Inline/module syntax, staged context-policy and whitespace checks pass; all 243 shipped runtime files, including binaries, match across layouts. Host tests normalize root asset/index paths to `dist/`; the final complete hosted run passes after that normalization.
- Browser / limits: isolated shipped shortcut and close handlers accept P, close with Escape and stay closed on a second Escape. Browser DOM confirms no open menu or pointer capture afterward. This QA browser did not acquire pointer lock and cannot initialize WebGL for the 139 scene, so native behavior is verified but physical mouse-release behavior, rendered floor flicker/appearance and GPU/device frame stability still need acceptance. Temporary QA pages must be removed before packaging. Publish to the existing owner-private Site and open a main-targeted PR; do not infer a merge.

### 2026-10-22 — Trees and shrubs sway in the wind

- Request / reason: owner asked to continue onto the next improvement; palms swayed but street trees and the new shrubs were perfectly still.
- Result and status: implemented on branch `foliage-wind` and proposed for merge. Not merged or published.
- Affected files / systems: new `assets/foliage-wind.js`, `tests/foliage-wind.test.mjs`; `assets/city-visuals.js` (canopy materials), `assets/shrubs.js` (rooted wind), `index.html` (advance with weather).
- State/save/migration: none.
- Validation actually run: `npm test` 114/114 across 68 files; two-frame software-WebGL diff. No full-game, GPU, device or Site parity check.
- Remaining work: shadows stay still; palms do not yet follow the weather strength.

### 2026-10-22 — Leafy shrubs instead of green balls

- Request / reason: owner asked to continue onto the next improvement; planting beds used smooth spheres and icosahedra, the most artificial-looking objects left on residential streets.
- Result and status: implemented on branch `leaf-shrubs` and proposed for merge. Not merged or published.
- Affected files / systems: new `assets/shrubs.js`, `tests/shrubs.test.mjs`; `assets/city-visuals.js` (`shrub()` on the visual kit), `assets/planned-community.js` and `assets/community-plaza.js` (beds and planters use it, with sphere fallback).
- State/save/migration: none. Collision, camera and planter geometry are unchanged; shrubs are not collidable (the spheres were not either).
- Validation actually run: `npm test` 113/113 across 67 files; software-WebGL renders. No full-game, GPU, device or Site parity check.
- Remaining work: trees and downtown planters are unchanged.

### 2026-10-22 — Scanned lawns with anti-tiling

- Request / reason: owner asked to continue onto the next improvement; grass was the last procedural ground surface and looked smeared and streaky in recent renders.
- Result and status: implemented on branch `lawn-scans` and proposed for merge. Not merged or published.
- Affected files / systems: `assets/city-materials.js` (grass profile and generator, `macro` anti-tiling and patch shader), `assets/city-visuals.js` (every surface, grass included, comes from the shared PBR factory; the canvas grass generator is removed), `assets/city-scans.js` (grass → `leafy_grass`), `assets/city/textures/` (six lawn files, attribution), `tests/city-scans.test.mjs`.
- State/save/migration: none. Lawn color stays the existing green tint.
- Validation actually run: `npm test` 112/112 across 66 files; software-WebGL renders before scans (procedural fallback) and after. No full-game, GPU, device or Site parity check.
- Remaining work: sand and coastal ground still use their own materials; trees and shrubs are unchanged.

### 2026-10-22 — Seated people breathe, look around and keep feet on the floor

- Request / reason: owner asked to continue onto the next improvement; seated characters were frozen in a static pose, and adult feet sank through the floor on standard seats.
- Result and status: implemented on branch `seated-life` and proposed for merge. Not merged or published.
- Affected files / systems: `assets/crowd-life.js` (`SEATED_MOTIONS`, `seatedMotion`), `assets/characters.js` (lazy seated clips, seated schedule, upper-body clip with two-bone leg fit in `seatedPose`), `tools/prepare-motions.mjs` (also builds seated clips), eight clip GLBs, new `tests/seated-life.test.mjs`.
- State/save/migration: none.
- Validation actually run: `npm test` 112/112 across 66 files; software-WebGL bench renders. No full-game, GPU, device or Site parity check.
- Remaining work: table-specific clips (arms on the table) are not used; couch seats deeper than a chair may need per-seat foot offsets.

### 2026-10-22 — Townspeople look around, text and chat

- Request / reason: owner asked to continue onto the next improvement after people and pets merged. Standing NPCs all looped one idle clip, and phone memory with the full crowd pool was the main open risk.
- Result and status: implemented on branch `crowd-life` and proposed for merge. Not merged or published.
- Affected files / systems: new `assets/crowd-life.js`, `tools/prepare-motions.mjs`, `tests/crowd-life.test.mjs`, 14 clip GLBs in `assets/characters/`; `assets/characters.js` (lazy ambient clips, schedule in the update loop, phone prop, `ambient`/`turn`/`ambientSeed` options, `crowdLimit`); `assets/character-roster.js` (interleaved pools, `limit`); `assets/pets.js` (Commons dog moved to the lawn, off the play structure); `index.html` (crowd limit by device, `conversation()` and three pairs).
- State/save/migration: none.
- Validation actually run: `npm test` 111/111 across 65 files; inline module `node --check`; software-WebGL renders of texting and a conversation. No full-game, GPU, device or Site parity check.
- Remaining work: conversations are scenery (no player interaction).

### 2026-10-22 — Varied townspeople, kids and pets

- Request / reason: owner asked to continue realism with people, then added that kids and pets are needed along with adults. For pets the owner chose free low-poly models for now, since realistic animated pets are paid.
- Result and status: implemented on branch `people-realism` and proposed for merge. Not merged or published.
- Affected files / systems: new `assets/character-roster.js`, `assets/pets.js`, `assets/characters/crowd/` (13 GLBs, README), `assets/pets/` (dog, cat, attribution), `tools/prepare-characters.mjs`, `tools/prepare-pets.mjs`, `tests/people-pets.test.mjs`; the six original character GLBs gain roughness maps; `assets/characters.js` (roster import, `crowd`/`crowd-child`, bone prefix from the roster, roughness-map aware materials); crowd models at `community-plaza.js` (plus two extra playground kids), `north-world.js`, `coast-world.js` and ambient/crossing/visitor NPCs in `index.html`; pets created and updated in `index.html`; `tests/community-plaza.test.mjs` expects five Commons neighbors.
- State/save/migration: none. Story characters, outfits and saves are unchanged; pets are not saved.
- Validation actually run: `npm test` 110/110 across 64 files; inline module `node --check`; software-WebGL renders of every model, walking crowd models and pets. No full-game, GPU, device or Site parity check.
- Remaining work: phone memory check with all crowd models loaded; pets ignore obstacles and other characters by design (they stay in open yard and lawn areas); realistic pets need a purchase decision; no cat at the Commons and no pet interactions.

### 2026-10-22 — Scanned surfaces for every community home and the city

- Request / reason: after the 101 Maple Grove pilot merged, the owner asked to continue; the agreed next step was extending scanned materials to the other community homes.
- Result and status: implemented on branch `community-realism` and proposed for merge. Not merged or published.
- Affected files / systems: new `assets/city-scans.js`, `assets/city/textures/` (tone maps for eight kinds, full sets for clean asphalt, concrete wall panels and lap siding, attribution), `tools/prepare-city-textures.mjs`, `tests/city-scans.test.mjs`; `assets/city-materials.js` (`upgrade()`, per-material tile and roughness scale, wetness keeps the scale); `assets/house-surfaces.js` (matte roof and brick roughness); `index.html` (one memoised KTX2 loader for house and city).
- State/save/migration: none. Building colors are unchanged; if a scan fails that kind keeps its procedural maps.
- Validation actually run: `npm test` 109/109 across 63 files; inline module `node --check`; community-only software-WebGL renders before and after at desktop and phone width. No full-game, GPU, device or Site parity check.
- Remaining work: device check; downtown towers and shops were not rendered with the scans yet; grass is still procedural; per-home light bakes and people are not started.

### 2026-10-22 — Realism pilot for 101 Maple Grove

- Request / reason: owner asked for homes and people that look as realistic as possible, close to GTA 6, and approved a lighting and materials pilot on the furnished house first, with no new purchases.
- Result and status: merged to main as PR #52. Not published to the Site.
- Affected files / systems: new `assets/house-surfaces.js`, `assets/house-bake.js`, `assets/house-furniture.js`, `assets/house/` (textures, furniture, bake, attribution), `tools/prepare-house-textures.mjs`, `tools/prepare-house-furniture.mjs`, `tools/bake-house-light.mjs`, `tests/house-realism.test.mjs`; `assets/landmark-house.js` (per-face materials, merged static meshes, furniture stand-ins, bake and probe API, plinth lowered to stop floor z-fighting), `assets/camera-geometry.js` (per-piece boxes from merged meshes), `index.html` (asynchronous texture, bake and model loading; indoor character shading for the player and Mom).
- State/save/migration: none. Saves, colliders, seats and interactions are unchanged; failed downloads only log a warning and keep the plain look.
- Validation actually run: `npm test` 108/108 across 62 files; house-only headless Chromium renders (software WebGL) at desktop and phone width with no page errors. No full-game render, GPU, physical device or Site parity check.
- Remaining work: device check and tuning; wall seam cleanup; then other homes and people if the owner approves the look.

### 2026-10-22 — Scale story money by age tier

- Request / reason: owner asked for a tier-scaled economy so older kids handle realistic amounts (rent, a paycheck, interest), and chose a per-tier price sheet with equal pacing, all four Planner systems, savings interest for Builder and converting balances on a tier change. Read-aloud was declined.
- Result and status: implemented on branch `tier-economy` and proposed for merge. Not merged or published.
- Affected files / systems: new `assets/economy.js`, `assets/money-life.js`, `tests/economy.test.mjs`, `tests/learning-money-scale.test.mjs`; catalogues scaled in `vehicle-ownership.js` (plus financed buys), `home-life.js`, `wardrobe.js`, `courier-jobs.js`, `city-rules.js`, `city-errands.js`, `business-days.js`; learning `format.js`, `skills.js`, `question.js`, `generators/money-basics.js`, `parent-view.js`, `content.en.js`; `index.html` (every money amount, money formatting with thousands separators, housing terms, garage table and loans, planner weekly-money section and bills, payday hook, conversion, save fields, Parents tier change); test loaders in five existing tests resolve the new `./economy.js` import; `story-flow.test.mjs` pins its original playthrough to Sprout and adds Planner and Builder playthroughs; `home-life.test.mjs` gets the economy helpers.
- State/save/migration: adds `economy` and `moneyLife`. Old saves are Sprout amounts and convert to the child's tier on load (default Builder ×10). No fees, penalties or automatic payments are introduced.
- Validation actually run: `npm test` 107/107 across 61 files; inline module `node --check`; context check. Headless Chromium load of the full game at Planner: correct wallet, supply, goal and planner amounts, no page errors; no screenshots (software WebGL too slow). No GPU or physical-device check. Site parity not run (Site checkout unavailable); this runtime change intentionally diverges from the Site until published.
- Remaining work: child playtest and tuning of rates and Planner prices; decide whether old journal entries should show converted amounts.

### 2026-10-22 — Merge the learning layer into the house-marker PR

- Request / reason: owner asked to resolve PR #48's merge conflict after PR #50 (learning layer) merged to main.
- Result: merged main `c2f794c` into `codex/house-guide-target-marker`. All code (`index.html`, `assets/`, tests) merged without conflict; only this file conflicted, where both sides added ledger entries. Both entry sets are kept. Status lines now say the learning layer is merged, and the PR table lists #50.
- Correction: PR #50's commits omitted its intended baseline, merge-forward and PR-table context updates because a chained shell command stopped before the edit ran. Those details are added here.
- Compatibility: no runtime behavior change from the merge itself. Saves keep `houseGuide`, `homeLife.textileStyle`, `learning` and `gardenReflectionDue` side by side; the City menu keeps House rooms & objects and Parents.
- Validation: `npm test` 91/91 across 59 files; inline module syntax check; context policy check. No browser, GPU, device or Site-parity check.
- Remaining work: unchanged from the marker, textile and learning entries below. Publishing this combined runtime to the Site requires a parity run first.

### 2026-10-22 — Give the furnished home saved textile styles

- Request / choice: continue useful landmark development. Extend the existing paid textile improvement into a small decorating experience, preserving the pending marker PR #48 and its published playtest.
- Result: Home & daily life → Make it your own presents Ocean blue, Garden sage and Warm clay swatches, current selection and free restyling after the existing 100-cent textile purchase. Selection updates the actual rug, sofa/main-bed fabric and guest-bed duvet; no furniture placement or automatic purchase occurs. Active home access, completed business stage and being out of vehicles are required. Installed appearance survives rental expiry; renewal unlocks editing again.
- Affected: `home-life.js` shared catalogue/eligibility/restoration, `landmark-house.js` existing materials/cache, actual entry-point panel/action/CSS, new `home-decor.test.mjs`, README/source notes and this context. The follow-up is based on PR #48 head `97fd6a53a8a79af51e1882b55217cbb8173007b1`, rather than silently dropping its unmerged work.
- Compatibility / budget: optional whitelisted `homeLife.textileStyle`, default ocean, keeps version 1 and existing portable saves. Legacy installed textiles retain the original colors with no repayment. Missing/invalid/unowned styles reset safely. Free changes preserve wallet, savings, debt, spending and day. No new meshes, colliders, lights, textures or rendering targets; no material/geometry allocations or plaque uploads when changing palettes.
- Validation: repository 71/71 cases across 56 test files; hosted layout 54/54. Coverage includes portable/legacy/invalid saves, lease boundary/renewal, one-time unlock, zero-wallet styling, actual panel handlers and repeat/invalid/vehicle/story refusal, real material colors and 3,000 stable-resource scene updates. Isolated browser panels using shipped handlers/CSS passed desktop and 390-pixel phone-width selection/scrolling. Temporary QA pages were removed before packaging. Syntax, staged context-policy, whitespace and all 83 runtime-file parity checks pass.
- Limits / delivery: isolated UI and native Three checks do not prove rendered 3D appearance or physical-device frame stability. Publish to the existing owner-private Site, then open a stacked GitHub PR against #48 while it remains open. Exact source/deployment/PR/CI outcomes belong in the handoff; do not infer a merge.

### 2026-10-22 — Mark the selected household approach in the world

- Request / reason: continue the next useful improvement. The house directory supplies a plan and text, but a nearby visual cue makes the selected interaction point easier to recognize while walking.
- Result: added a stationary mint ring/diamond using the existing saved `houseGuide.targetId`. It follows the actual action approach on the correct floor, within six meters, only when player and camera sightlines clear household colliders. Live doors, walls and furniture can hide it. Menus/background, vehicles, seats/resting, stairs, floor/ceiling mismatch and Focus view hide it; cancel/completion removes it through existing guide state.
- Affected: new `house-target-visuals.js`, initialization and post-camera frame update in `index.html`, focused native/integration tests and current README/source/context. Camera snapshots ignore the decoration; no physics, navigation or rain-shelter obstacle is introduced.
- Compatibility / budget: no new save or settings fields, charges, rewards or automatic household actions. Two fixed meshes, 72 triangles and one depth-tested unlit material; no lights, shadows, textures, new render targets or geometry/material allocation during updates. Front faces avoid duplicate transparent back/front passes; cleanup disposes resources once.
- Validation: full repository 70/70 cases across 55 files; hosted source 53/53; focused marker checks after projection/material polish; syntax/context/whitespace checks and all 83 runtime files matched. Real scene tests cover every approach, closed/open door changes, wall/furniture occlusion, both floors, camera height, range, invalid targets, pause/vehicle/seat/Focus gates, actual shipped frame-call execution, portrait/desktop projection, camera-box exclusion, unchanged save and stable resources over 10,000 updates.
- Limits / delivery: browser WebGL still fails at startup, so native geometry/visibility tests do not verify rendered appearance or physical-device performance. Publish to the existing owner-private playtest and open the GitHub PR; final source/deployment/CI outcomes belong in the handoff, not an assumed merge.

### 2026-10-22 — Adaptive learning layer (skills, mastery, Garden Club, Parents page)

- Request / reason: owner asked to improve the game's learning design, chose an adaptive 6 to 12 band with skills map + mastery, Garden Club redo and a parent progress view, approved the design doc, and asked for the code as a PR to main.
- Result and status: merged to main in PR #50; not verified as published to the Site. Placement only suggests a tier (owner decision in the design doc).
- Affected files / systems: new `assets/learning/` modules and three `tests/learning-*.test.mjs` files; `index.html` (welcome-screen grown-up setup, wallet warm-up, generated customer questions, market payment scaling and $5/$10 bills, Garden Club, Parents menu entry, styles, save fields); `tests/story-flow.test.mjs` (wrong-then-right task answers, placement, Garden settle/reflection, Parents page, serializer); README section.
- State/save/migration: adds `learning` and `gardenReflectionDue` to the story save; older saves default to Builder with skills New; legacy Garden investments settle with their original payouts. The fixed `businessTasks` lists are removed. Economy prices/earnings unchanged.
- Validation actually run: `npm test` 86/86 across 54 files on this branch from main `72ed6aa`; generator checks cover all 12 skills × 5 levels × 1,000 seeds; inline module syntax checked. Earlier on the previous base the game loaded in headless Chromium with software WebGL with no page errors and the learning panels were screenshot-checked at desktop and phone widths in a harness. No GPU, physical-device or audio check. Site parity not checked (Site checkout unavailable); this runtime change intentionally diverges from the published Site until deployed.
- Merge forward: the work arrived as an owner-supplied archive built on `72ed6aa`. It was recommitted there (86/86), then merged with main through PR #47 before PR #50. Conflicts were additive: CSS, `houseGuide` and `learning` save/restore/reset fields, and the City menu, which lists both House rooms & objects and Parents. After that merge `npm test` passed 89/89 across 57 files. These notes were intended for PR #50 but were omitted from its commits by a scripting error, and are recorded here instead.
- Remaining work: child playtest and tuning; Spanish strings and read-aloud; optional tier-scaled economy; play-time tracking.
### 2026-10-22 — Give household actions responsive sound

- Request / reason: continue the next useful improvement to the furnished landmark. Household interactions changed visuals but had no specific audio feedback.
- Result: short door/latch, switch, appliance, fabric, TV, basin and flush textures follow successful actions. Running water and the washer use two reusable spatial layers from actual saved state. Added a saved Household sounds switch under Sound settings, using Effects volume. World pause/background/vehicle/category gates silence the continuous layers; disabled/backgrounded short household sounds stop without replay on return.
- Affected: new `house-audio.js`, `city-audio.js`, validated object/rest/bed handlers and animation sampling, new house-audio tests, existing mixer/story tests, current README/source/context. Source sampling reuses house room metadata and actual action positions; no sound is triggered by viewing menus or restoring flags.
- Compatibility / budgets: no story save, price, ownership or household-flag schema changes. Existing `mapleStreetAudioV1` gains `household`, default true; existing volume/mute preferences remain. Twelve fixed sources reuse the original noise buffer; global short-voice cap stays eight. No per-frame node creation, graphics allocation, external audio assets or permissions.
- Validation: 69/69 repository cases across 54 files, 52/52 hosted cases, syntax/context/whitespace checks and all 82 shipped files matching. Tests cover real source positions, saved state, floors/doors/distance/stereo, every sound profile, gesture/mute/category/background gates, paused-chooser audio-clock cooldown, node/voice budgets, cleanup and actual successful/rejected interaction dispatch. Browser offline/live Web Audio render, gesture unlock and household mute passed using a removed temporary QA page.
- Limits / delivery: physical listening/volume tuning and full GPU/mobile acceptance remain open. Publish through the existing owner-private Site and open the corresponding GitHub PR; exact source/deployment/CI outcomes belong in the final handoff, not an assumed merge.

### 2026-10-22 — Map both floors and find household objects

- Request / reason: continue useful development of the flagship house. The existing settling guide gives tasks, but players need a way to understand rooms, stairs and object locations.
- Result: implemented City menu / nearby chooser → House rooms & objects, with separate floor plans, actual player/target positions, nine room groups and all 25 furnished interactions. A selected object gives a compact indoor location cue, including stairs and closed room doors. It clears after successful interaction or explicit cancellation. Existing city routes and settling progress remain independent.
- Affected: new `house-guide.js`, runtime UI/save integration, `house-guide.test.mjs`, actual-scene story-flow checks, current README/source/context. Plans use actual collision/door/action data and group metadata; this is location guidance with normal walking, not automatic travel or an obstacle-aware path solver.
- Compatibility: optional whitelisted `houseGuide.targetId` defaults to null in old saves and survives existing export/import; no new backup version. Existing economy, ownership, household flags and scene geometry stay intact. Guidance is free for visitors. Vehicle mode hides the indoor cue and outside resumes the selected city route.
- Validation: 68/68 repository cases across 53 files and 51/51 hosted cases; focused guide/UI checks after layout polish; all 81 runtime files match across layouts. Coverage includes every real approach, room/floor classification, closed exit doors, stairs, markers, invalid targets, portable saves, real modal handlers, selection/restore/completion/cancel and city/HUD coexistence. Desktop and phone-width isolated browser UI passed; full 3D/physical-device testing is still outstanding.
- Delivery: include this context in both source commits, publish to the existing private playtest and open a GitHub PR with full game/context CI. Exact source/deployment/PR results belong in the final handoff; this entry does not claim an unobserved merge.

### 2026-10-22 — Select every reachable furnished-house object

- Request / reason: continue the next useful work on the flagship house. Source inspection found that the main bed and curtains share an approach point, leaving the curtains hidden behind nearest-object selection; nearby kitchen/bathroom fixtures also compete for the prompt.
- Result: added a paused nearby-object chooser when several household items are reachable, current state/action labels and a contextual Choose object touch prompt. Doors remain direct; isolated objects preserve one-action interaction. Toggling refreshes the panel, and seating, beds, wardrobe and home plans retain their existing flows.
- Affected: `landmark-house.js`, runtime entry point, new `house-interactions.test.mjs`, actual-scene story-flow integration and current README/source/context. Both source layouts receive the same runtime. PR/publication results are in the handoff; no unobserved merge is claimed.
- Compatibility: existing house flags and save format, wallet/savings, home ownership and geometry budgets remain unchanged. Discovery and execution now share floor, distance, finite-position and obstacle checks; stale or remote chooser calls cannot activate objects.
- Validation: repository suite 67/67 across 52 files; tests cover every actual furniture approach, bed/curtain overlap, all TV channel states, bathroom choices, closed doors, different floors, invalid positions, persistence, prompt dispatch, paused panels, resting/seating and direct doors. Isolated browser chooser/CSS verified at desktop and 390-pixel widths; WebGL startup remains unavailable in this browser, and physical iPhone/Safari acceptance remains outstanding. Temporary QA files are removed before source packaging.
- Source checks: the hosted-layout suite also passes 50/50 cases; all 80 shipped runtime files match the GitHub candidate. Inline module syntax, staged context-policy and whitespace checks pass. These checks ran after the temporary QA files were removed.
- Delivery: package and publish through the existing owner-private Site, keep all 80 shipped runtime files aligned with the GitHub candidate, and include context in both source commits. Full game CI and context CI run on the PR.

### 2026-10-21 — Reconcile playtest runtime and guard against source drift

- Request/choice: continue with the next useful task. Closed the known repository/playtest source gap before adding another gameplay system.
- Implementation: reviewed and applied the entry-point diff from merged main `59bc1871349d67d6bdcc82a11602d29ad2d28d4a` to hosted source `d79f280a4fd3fa50aae6eb9b57e0a03ee4245059`; synchronized eight runtime assets (weather, rain, emergency audio, atmosphere, mixer, visuals, graphics recovery and traffic rhythm) and eight matching test files. Existing houses, doors, address directory and economy remain intact.
- Guardrails: added the read-only complete-runtime parity command, six positive/negative tests and full game regression CI. Updated README, source guide and contributor instructions. CI has no Site credentials; its unit tests do not compare the private deployment.
- Compatibility: no story schema, prices, home identities or transaction changes. Existing weather/audio preferences retain their original keys. Restored-context reloads are rate-limited; manual recovery remains. The Site already has this runtime, so no new deployment or audience change is needed.
- Validation: 66/66 Node cases across 51 files pass with original binary assets; all 80 shipped files match across layouts. Inline module syntax and staged context-policy checks are required before handoff. Native results do not establish physical iPhone/Safari stability, GPU quality or audible balance. PR/CI outcome belongs in the final handoff; this entry does not claim an unobserved merge.

### 2026-10-21 — Neighborhood entry, plaques and address directory

- Request/reason: continue the next useful work, prioritizing reported unusable doors and exterior house identities.
- Result: recovered the already-published Site version 62 door/plaque work (source `26ecf86fb50c60bf0421516f83de7ce5260b6d68`) into a focused GitHub change, then added a street-grouped address directory with 27 walking/parking destinations. Source implementation is complete; PR/publication outcomes are reported in the handoff. Existing hosted weather/sirens and unrelated graphics recovery are preserved; weather/siren reconciliation remains separate.
- Affected: `residential-doors.js`, `planned-community.js`, `landmark-house.js`, `touch-controls.js`, `city-navigation.js`, new `community-addresses.js`, entry-point UI and door/address/home/story tests. Other homes now have hollow ground-floor shells rather than solid blockers. The first house remains the only two-floor furnished property.
- Compatibility: no economy or ownership schema changes; saved navigation accepts stable community IDs, old destinations remain available, protected money is unchanged. Shared neighborhood door states reset on reload, whereas the furnished home's saved household state persists.
- Validation: the full Site suite passed 49 tests; the repository suite passed 58 cases across 48 test files (including 11 context-policy cases). Both inline runtime modules parse, staged context policy and whitespace checks pass. The door fixture checks 79 leaves, closing clearance, both orientations, real collision/navigation gaps and 27 illuminated unique plaques. Address checks cover exterior approaches, full car footprints in spare bays and actual menu buttons; story integration covers all 27 selections and route save/restore without money changes. The home-life fixture no longer assumes a particular first destination property. Browser preview reaches the graphics-recovery screen because WebGL cannot initialize, so the 3D scene remains unverified there.
- Limits/remaining: GPU appearance, audible balance and physical-device acceptance remain unverified. Other homes are unfurnished downstairs with inaccessible upper floors. Follow-up should confirm the original device report and reconcile remaining hosted/GitHub divergence.


### 2026-10-21 — Initialize maintained project context and update policy

- Request: make the repository understandable to any reader and keep context current after every change.
- Result: consolidated current product/architecture/state/UX/roadmap and all PR milestones in this document; added agent instructions, README/preview-source entry points, PR checklist, per-commit CI policy and focused policy tests. This maintenance policy was merged in PR #42.
- Evidence: audited main `1daa06fee727895b3ab422df3b972aa90d4adb62`, current imports/tree, README, home-life rules, asset provenance and PRs #1–41. Discovered GitHub/hosted weather/siren divergence and historical PR #8 features that cannot be assumed present.
- Affected systems: documentation and contributor/CI workflow only; no game, economy, asset, save or deployment behavior changed.
- Validation: `node --test tests/context-policy.test.mjs` passed all 11 cases against temporary Git histories, including staged edits, missing/empty/whitespace-only context, multiple commits, merged side branches, advanced main and invalid ranges. Both maintenance JavaScript files pass `node --check`. No new full gameplay-suite or physical-device claim.
- Remaining: make `Project context / context-current` required if merge blocking is desired, then update this document in every subsequent commit. Existing older commits are not retroactively rewritten.

### Historical milestones

The table below records reviewed merged PR milestones through #50 merged to main. PR #48 subsequently merged with main after #50, including #49's marker work. Current-source exceptions above still apply. PR bodies contain their original tests, limitations and detailed scope. These are implementation milestones, not a verbatim archive of every chat. No unseen conversation is claimed to have been reconstructed.

| PR | Milestone | Merged (UTC date) |
| --- | --- | --- |
| [#1](https://github.com/DESIR33/My-City-My-Choices/pull/1) | Build Chapter 1 as an explorable 3D city | 2026-10-18 |
| [#2](https://github.com/DESIR33/My-City-My-Choices/pull/2) | Expand Maple Street into a City Economy | 2026-10-18 |
| [#3](https://github.com/DESIR33/My-City-My-Choices/pull/3) | Improve city graphics and add detailed animated characters | 2026-10-19 |
| [#4](https://github.com/DESIR33/My-City-My-Choices/pull/4) | Extend city life with business stories, money plans, and car ownership | 2026-10-19 |
| [#5](https://github.com/DESIR33/My-City-My-Choices/pull/5) | Add city services, café life, seating, and crash response | 2026-10-19 |
| [#6](https://github.com/DESIR33/My-City-My-Choices/pull/6) | Expand north into Northstar City and open Maple Bakery | 2026-10-19 |
| [#7](https://github.com/DESIR33/My-City-My-Choices/pull/7) | Fix backward NPC walks and the Maple fire engine | 2026-10-19 |
| [#8](https://github.com/DESIR33/My-City-My-Choices/pull/8) | Add school, grocery, bus, park, and Northstar rooms | 2026-10-19 |
| [#9](https://github.com/DESIR33/My-City-My-Choices/pull/9) | Let the driver walk away after a crash | 2026-10-19 |
| [#10](https://github.com/DESIR33/My-City-My-Choices/pull/10) | Improve vehicle cornering and prevent intersection blockages | 2026-10-19 |
| [#11](https://github.com/DESIR33/My-City-My-Choices/pull/11) | Fix NPC facing and story interaction triggers | 2026-10-19 |
| [#12](https://github.com/DESIR33/My-City-My-Choices/pull/12) | Improve vehicle realism and crossing signals | 2026-10-19 |
| [#13](https://github.com/DESIR33/My-City-My-Choices/pull/13) | Fix walking after exiting a vehicle | 2026-10-19 |
| [#14](https://github.com/DESIR33/My-City-My-Choices/pull/14) | Add city lighting, night driving, and correct bridge vehicle pitch | 2026-10-19 |
| [#15](https://github.com/DESIR33/My-City-My-Choices/pull/15) | Diversify civilian vehicles with three brands and twelve paint colors | 2026-10-19 |
| [#16](https://github.com/DESIR33/My-City-My-Choices/pull/16) | Add Sunshore coastal city south of Maple Street | 2026-10-19 |
| [#17](https://github.com/DESIR33/My-City-My-Choices/pull/17) | Make Maple Cafe serve paying customers and preserve indoor building shells | 2026-10-19 |
| [#18](https://github.com/DESIR33/My-City-My-Choices/pull/18) | Fix Rivergate Bridge flicker and let crashed vehicles reverse away | 2026-10-19 |
| [#19](https://github.com/DESIR33/My-City-My-Choices/pull/19) | Add rideable bikes, saved wardrobes, and coastal palm upgrades | 2026-10-20 |
| [#20](https://github.com/DESIR33/My-City-My-Choices/pull/20) | Add a walkable modern interior to The Flamingo | 2026-10-20 |
| [#21](https://github.com/DESIR33/My-City-My-Choices/pull/21) | Follow the real sunset, and show jobs, clothes, and interiors | 2026-10-19 |
| [#22](https://github.com/DESIR33/My-City-My-Choices/pull/22) | Upgrade cinematic buildings, PBR roads and wet-surface handling | 2026-10-20 |
| [#23](https://github.com/DESIR33/My-City-My-Choices/pull/23) | Add city navigation and paid courier deliveries | 2026-10-20 |
| [#24](https://github.com/DESIR33/My-City-My-Choices/pull/24) | Add responsive city sound and saved volume controls | 2026-10-20 |
| [#25](https://github.com/DESIR33/My-City-My-Choices/pull/25) | Make city traffic yield to pedestrians and occupied crosswalks | 2026-10-20 |
| [#26](https://github.com/DESIR33/My-City-My-Choices/pull/26) | Clear the play area with a compact HUD and single city menu | 2026-10-20 |
| [#27](https://github.com/DESIR33/My-City-My-Choices/pull/27) | Keep follow cameras clear of walls and add comfort settings | 2026-10-20 |
| [#28](https://github.com/DESIR33/My-City-My-Choices/pull/28) | Add rush-hour traffic, horns and camera comfort controls | 2026-10-20 |
| [#29](https://github.com/DESIR33/My-City-My-Choices/pull/29) | Add portable saves, import previews and recovery checkpoints | 2026-10-20 |
| [#30](https://github.com/DESIR33/My-City-My-Choices/pull/30) | Save on app switching and pause the city safely | 2026-10-20 |
| [#31](https://github.com/DESIR33/My-City-My-Choices/pull/31) | Add jumping, correct foot contact, surface footsteps and motorcycle gears | 2026-10-20 |
| [#32](https://github.com/DESIR33/My-City-My-Choices/pull/32) | Add playable vehicle horns and bicycle bells | 2026-10-21 |
| [#33](https://github.com/DESIR33/My-City-My-Choices/pull/33) | Add rain, overcast lighting and roads that wet and dry | 2026-10-21 |
| [#34](https://github.com/DESIR33/My-City-My-Choices/pull/34) | Make city traffic adapt to rain and wet roads | 2026-10-21 |
| [#35](https://github.com/DESIR33/My-City-My-Choices/pull/35) | Add spatial sirens to police emergency responses | 2026-10-21 |
| [#36](https://github.com/DESIR33/My-City-My-Choices/pull/36) | Build Maple Grove planned community with 27 two-story homes | 2026-10-21 |
| [#37](https://github.com/DESIR33/My-City-My-Choices/pull/37) | Reduce neighborhood startup memory and handle graphics loss | 2026-10-21 |
| [#38](https://github.com/DESIR33/My-City-My-Choices/pull/38) | Add Maple Commons playground plaza and clean up neighborhood streets | 2026-10-21 |
| [#39](https://github.com/DESIR33/My-City-My-Choices/pull/39) | Make the first Maple Grove house a furnished, interactive landmark | 2026-10-21 |
| [#40](https://github.com/DESIR33/My-City-My-Choices/pull/40) | Connect Maple House ownership, improvements and daily life | 2026-10-21 |
| [#41](https://github.com/DESIR33/My-City-My-Choices/pull/41) | Guide players through settling into their furnished home | 2026-10-21 |
| [#42](https://github.com/DESIR33/My-City-My-Choices/pull/42) | Add maintained project context and per-change documentation policy | 2026-10-22 |
| [#43](https://github.com/DESIR33/My-City-My-Choices/pull/43) | Connect neighborhood doors, address plaques and saved house guidance | 2026-10-22 |
| [#44](https://github.com/DESIR33/My-City-My-Choices/pull/44) | Reconcile playtest weather, sirens and mobile recovery with GitHub | 2026-10-22 |
| [#45](https://github.com/DESIR33/My-City-My-Choices/pull/45) | Make every nearby household object selectable in the Maple House | 2026-10-22 |
| [#46](https://github.com/DESIR33/My-City-My-Choices/pull/46) | Add a two-floor house map and saved furniture guidance | 2026-10-22 |
| [#47](https://github.com/DESIR33/My-City-My-Choices/pull/47) | Add responsive household sound with bounded audio layers | 2026-10-22 |
| [#50](https://github.com/DESIR33/My-City-My-Choices/pull/50) | Add adaptive learning layer: skills, mastery, Garden Club and Parents page | 2026-10-22 |
