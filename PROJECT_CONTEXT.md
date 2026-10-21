# My City, My Choices — project context

Last updated: 2026-10-21 (America/New_York). Maintained project handoff, product brief, architecture guide, decision record and change ledger.

**Read this document before changing the project. Update it in every change commit, including fixes, assets, configuration, tests and documentation.** See [Maintenance contract](#maintenance-contract). This is the current-state guide; Git history and linked PRs retain implementation detail and earlier states.

## Start here

My City, My Choices is a single-player, third-person browser life-skills game. A child avatar learns to earn, budget, save, run a business and make deliberate spending decisions while exploring three connected districts. The city must feel like a place to live: believable homes, shops, neighbors, vehicles, public spaces and useful interactions. It is an evolving playable prototype, with a premium cinematic direction and a strong mobile/desktop usability requirement.

- Repository: [DESIR33/My-City-My-Choices](https://github.com/DESIR33/My-City-My-Choices).
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site (owner access required; do not change sharing without a request).
- Audited GitHub baseline: `1daa06fee727895b3ab422df3b972aa90d4adb62`, including merged work through [PR #41](https://github.com/DESIR33/My-City-My-Choices/pull/41). This document's initialization changes only documentation and maintenance tooling.
- The repository serves root `index.html` and `assets/`. The separate Sites checkout serves `dist/index.html` and `dist/assets/`. They are related source layouts, not interchangeable directory trees.
- Current major feature: furnished 101 Maple Grove Lane, connected to renting/buying, improvements, daily reviews and an optional settling-in guide.
- Highest-priority follow-up: interaction discoverability and actual-device stability. Related project feedback says doors do not open or explain interaction, and asks for beautiful house-number displays on every front exterior. Only the first Maple Grove home is furnished/interactive in this baseline; the others remain shells.
- Multiplayer, server-assigned properties, cloud save synchronization and a production real-estate economy are not built.

### Evidence and confidence

The current source tree, runtime imports, module code, README and all 41 PR records were reviewed for this document. A merged PR is historical evidence, not proof that all its changes remain in today's tree. Earlier implementation notes and test counts in README are chronological and can be stale. Use this document's current-state distinctions and inspect source before changing behavior.

**Known source divergence:** current GitHub main has 45 `tests/*.test.mjs` files and does not contain or import `assets/city-weather.js` or `assets/emergency-audio.js`. PRs #33–35 describe rain, wet-weather traffic and spatial emergency sirens, and PR #41 reports preserving them in the hosted playtest. The hosted suite was reported at 47 passing test files. Do not claim these two layouts are identical or that the weather/siren modules currently exist on GitHub main. Reconcile with a focused diff before synchronizing; never overwrite either index wholesale. This documentation task does not repair that divergence or independently verify the live game's runtime.

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
| Clean, complete, cinematic architecture and believable materials/physics; GTA 6 as an aspiration | Improve actual asset quality, lighting, road logic and handling while preserving a playable browser game | PBR procedural materials, architectural detail, quality modes and better vehicles; not GTA 6 parity |
| First house as a major interactive landmark that should wow players | Open a real door, physically enter, explore furnished floors and use household objects | 101 Maple Grove has rooms, stairs, furniture and household actions |
| Eventually assign homes to players; rent, purchase and improvements | Persistent property identity, financial consequences and extensible state | Local single-player assignment/rental/purchase/projects now exist; multiplayer assignment does not |
| Cars in driveways and no confusing road-like empty spaces with trees in them | Connected road surfaces; real parking footprints; landscape pockets should read as planting | Eight driveway cars, cleared road stubs, driveway cuts and twelve planted pockets |
| Less screen clutter on phones and desktop | Preserve the central view; contextual actions; consolidated menu | Compact HUD, Focus view, one objective/route line, context-sensitive controls |
| Jump, correct foot placement and different footsteps by surface | Physical height and grounding must agree with animation and sound | Jump integration, calibrated foot contact and surface sound profiles |
| Congestion, horns and other city activity | City time affects bounded traffic demand and queues | Rush/quiet modes, queue horns, pedestrian yielding, manual horns/bells |
| Door interaction feedback and attractive front-wall addresses on every house | Players must recognize an interactive entrance and identify properties from the street | Open follow-up; mailboxes have numbers, first house has plaques; no all-home front-wall address pass verified |
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

### Controls and UI

| Situation | Desktop | Touch |
| --- | --- | --- |
| Walk / look | WASD/arrows; mouse look after capture | Left stick; drag the scene with another finger |
| Run / jump | Shift / Space on foot | Run / Jump |
| Interact / sit / stand / doors | E near a valid target | Contextual Interact/Sit/Stand button |
| Enter/exit car; mount/dismount | F; E also mounts nearby two-wheelers | Contextual vehicle action |
| Car pedals and steering | W throttle, S brake/reverse, A/D steer, Space handbrake | Driving stick and brake/exit controls |
| Two-wheeler recovery | R+S walks backward; dismount when stopped | Walk back + down, Rear brake, Dismount |
| Horn / bell | H while mounted | Jump position becomes Horn/Bell |
| City menu / map | Escape for menu; M for map | Menu and route/map affordances |

Default play HUD has Menu, a compact cash badge and one objective or route cue. Focus view hides cash and cues but retains Menu/essential controls. Dialogs pause gameplay, hide the play HUD, clear held inputs, support Escape and contain keyboard focus. The complete planner, map, journal, wardrobe, home and settings remain in City menu. Mobile layouts account for safe areas and landscape; contextual controls should not occupy the center of view.

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

Most city exteriors are scenery; do not promise every tower/home can be entered. The bridge, coastal roads and sidewalks are continuous. Northstar travel is intentionally a drive or a long walk, not an automatic teleport. The beach is walkable; swimming and driving into the sea are not enabled. Guardrails have actual beach-access gaps. Sunshore includes lifeguard towers, umbrellas/loungers, six usable ocean-facing benches, palms and residents.

### The first furnished house

Ground floor: entrance/gallery, living room with sectional/coffee table/media console and TV, kitchen with island/counters/sink/fridge/oven/drawers, dining table/chairs and utility/workbench/laundry space. Upstairs: two bedrooms with beds/nightstands, wardrobe/dresser, bathroom with basin/bath/shower/toilet and landing study. Rugs, textiles, curtains, plants, art, switches and warm fixtures finish the rooms. Thirty original interaction points cover doors, seating, beds and household objects; later home-life hooks add the entrance review/ownership experience.

Six animated physical doors cover front, patio, utility room, two bedrooms and bathroom. Collision follows each leaf's current angle; closing refuses an occupied sweep. Stair geometry has 18 real treads and a true upper-floor opening. Ground level is 0.30 m, upper floor 3.45 m; floor selection uses current height rather than taking the highest surface at the same X/Z. Furniture obstacles have vertical intervals so a downstairs table cannot block upstairs walking. Indoor camera limits and stair headroom are separate from exterior roof height.

Seating and beds have clear stand-up points; beds pose the real character horizontally. TV cycles three original drawn channels/off; taps, shower, lights, washer, drawers, curtains and appliance fronts have state/visual responses. Some household interactions are text feedback, not a detailed appliance simulation. The overhead garage facade is not a drive-through furnished garage feature. Wardrobe reuses owned clothes; it does not grant paid items.

The latest home-life work adds a personalized plaque and three visual projects without new collision boxes or lights. Earlier first-house-only geometry measurements (87 meshes / 11,130 triangles) are historical; PR #40 reported 99 meshes / 11,850 triangles after home-life additions. None of these numbers measure total game GPU memory or real frame rate.

### Street and landscape rules

Shared subdivision layout defines the same driveways/roads used by physics/navigation. Forest terrain and legacy trees respect developed land. Original west-road stubs were removed; curbs/sidewalks preserve neighborhood connections. Twelve inter-lot gaps are landscaped rather than left road-like. Eight existing-fleet cars fit whole footprints in selected drives, preserving the second bay and front walk. Cars were appended without reordering existing save IDs. Fences include open gates; do not close access accidentally when changing lots.

## Economy and persistent life

### Businesses, plans and earning

Four businesses: Saturday market, small restaurant, neighborhood store and neighborhood-help/service business. Each has a location, startup/supply plans and customer task. Market activity teaches bills/coins and change; other activities use order/product/route reading. Customer templates safely cycle over longer queues. Each completed order pays once, including zero-change sales.

Business days continue beyond the tutorial. Morning stories cycle through a street fair, supplier prices, equipment repairs, rain and new neighbors. Quotes show costs, sale price, customers, revenue and profit before paying. Upgrades add two customers; repairs can add one and change later repair stories. Chosen plans do not reroll just by reopening menus. The latest 20 day results are kept. Garden returns mature when the promised business day starts, not on a menu preview. A day off records zero sales/costs.

My city plan reserves wallet money for supplies, home/bills, car care, treats and unexpected needs. Reservations are labels over existing wallet cash, not extra balances. Matching expenses reduce their own reservation first. If a purchase leaves other plans short, the player can wait or deliberately accept the shortfall; the journal records the choice. Goal changes preserve savings. Startup grants are one-time; startup supplies use actual available cash. Optional neighbor work offers a $2 recovery path after a completed day; first-shift clothing/job-board work also exists. Preserve each job's eligibility and one-time protections rather than treating every $2 reward as interchangeable.

Courier contracts are nearby on-foot pickup and explicit handoff: Maple Bakery → Cafe ($1.25), Cafe → Northstar Motors ($3.25), Bakery → Flamingo ($3.75). One active contract, free cancellation, no deposit/deadline/penalty, one reward per contract per business day. Parcel, phase, receipts and side-job earnings persist. Choosing another route does not cancel the job. Rewards enter wallet cash, not goal savings or business sales.

### Shops, food and cars

Thread & Sole has 14 catalogue items across tops, trousers, shoes, hats and backpacks. Basket review, exact-cent costs, duplicate/affordability checks and receipts protect purchases. My wardrobe equips owned pieces free, removes accessories and restores original outfits; appearance updates on the real avatar.

Cafe NPCs have separate wallets, queue, pay, wait while the cashier prepares orders, collect food, occupy seats, consume and leave. Player tickets join paid service and survive saves with preparation time/receipts. Collection cannot charge or fulfill twice. NPC register income does not enter the player's wallet. Bakery orders use the existing food system; do not assume all café simulation behavior exists in every shop.

Maple Motors offers fictional used/refreshed coupes ($4/$6), fuel/service and an owned Mustang while free loaners remain available. Driving consumes fuel/condition; warnings and service affect handling/pace. An empty tank stops the engine. Fuel/service payments use wallet cash and transport plans. Roadside recovery relocates without gifting fuel, condition or money. Crash recovery is a separate free release of old disabled states, not a general upkeep refund.

### Housing, improvements and daily review

Rent/buy becomes available after business day two. Tours remain free. All prices below are fictional learning prices:

| Action | Price / effect | Constraints |
| --- | --- | --- |
| Rent / renew | $2 for seven business days including signing day | Explicit choice; no auto-renewal, late fees or automatic eviction |
| Buy | $5 down + five optional $1 installments | Existing remaining debt/payments preserved; owner cannot switch to renting accidentally |
| Ocean blue textiles | $1 | One-time actual rug/sofa/bedding change |
| Backyard container garden | $1.50 | One-time three terracotta planters |
| Upstairs study | $1.25 | One-time books/plant on actual desk |
| Daily review | Free, optional, once per business day | Must be inside; reports results/earnings/savings/upcoming plans; no reward, deduction or auto-time advance |

`home-life.js` assigns the local story to `maple-grove-1`. Legacy paid rent/purchase migrates without charging again; an old rental gets seven days from its saved business day. Buying retains projects and does not credit prior rent toward the purchase. Project quotes use cents and reject stale, canceled, repeated or unaffordable confirmation; preserve planned-spending review, business profit and protected savings.

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

Cinematic uses EffectComposer, optional GTAO, restrained HDR bloom, grading, OutputPass and FXAA. Smooth removes contact shading; Basic renders directly. Phones avoid unused AO allocation. Sustained slow frames reduce effects/resolution; render failure falls back. Physical-pixel caps prevent Retina/large screens from allocating oversized targets. Disabling effects disposes their targets. Neighborhood instancing historically reduced measured geometry/instance buffers by about 71% (13,771,288 → 4,002,976 bytes), not total GPU memory.

The camera checks a padded swept path against actual architecture bounds captured before batching, rechecks smoothed travel, limits terrain/ceilings and resets on teleports. Steady/Cinematic and Close/Standard/Wide settings persist separately. Do not collapse an entire building into one camera box that blocks real doorways. Moving house doors are excluded from stale static camera snapshots; physical player collision still follows them.

Local clock/sunset, held Day/Sunset/Night views and street/window/headlight behavior exist. Dry/After rain road grip is in GitHub main. Actual rain/overcast/streak pools, wetting/drying traffic behavior and sirens are historically implemented and reported hosted, but their dedicated modules are absent from the audited GitHub main. Future weather reconciliation must preserve the current local-sky mode, street wetness ownership, reflection palette restoration, pause gates and performance budgets.

Character assets are six self-hosted textured Microsoft Rocketbox variants and compatible animation clips with notices in `assets/characters/`. Detailed GLS/Senna browser assets derive from owner-supplied Blender files lacking external textures; runtime materials replace them. Keep provenance/license notices; supplied assets do not automatically grant unrelated redistribution rights. Premium vehicle source preparation lives in `tools/prepare-premium-vehicles.py` and `assets/vehicles/README.md`. Existing visual captures in `docs/visuals/` are historical asset/software-rendering evidence, not a current full-device acceptance test.

### Audio

`city-audio.js` synthesizes original engine/RPM, rolling, bicycle chain, footsteps, surf, wind, café/crockery, pickup/collision and traffic/horn layers. Surface footsteps distinguish asphalt/concrete/grass/stone/sand/wood; airborne/seated/teleported/mounted movement does not emit walking steps. Web Audio initializes on user gesture, has saved master/category/mute settings, bounded continuous/one-shot allocations and graceful silent fallback. Menus/background pause world audio. No microphone, recorded speech or real engine recordings are required.

Spatial response sirens were added in PR #35 and reported preserved on the hosted Site: bounded wail, distance/stereo/pitch variation, muted on arrival/return/missing responder, interior/vehicle filtering and saved toggle. Their module is absent from today's GitHub baseline; do not confuse historical audio evidence with a source-tree guarantee.

## Architecture and source map

`index.html` owns the page/CSS/import map, scene construction and integration: story state, DOM panels, wallet/transaction handlers, nearby interactions, vehicles, collisions, save/restore, settings, maps and animation loop. Modules split rules and scene construction, but the entry module remains substantial. Tests sometimes extract actual functions/sections into VM fixtures; changing section boundaries can require updating those fixtures meaningfully.

| Files under `assets/` | Responsibility / related tests |
| --- | --- |
| `world-rules.js` | District bounds, bridge/coast heights, roads, community lots and shared playable constraints; world/navigation/community tests |
| `north-world.js`, `coast-world.js`, `flamingo-hotel.js` | Northern/coastal construction, interiors, elevator and surface contracts; north/coast/bridge tests |
| `planned-community.js`, `community-plaza.js` | Lots, fences, landscaping, plaza/playground geometry and colliders; planned-community/community-plaza tests |
| `house-rules.js`, `landmark-house.js`, `home-life.js` | Stable property state, multi-level geometry, household actions, tenure/projects/guide; landmark-house/home-life/story-flow tests |
| `city-rules.js`, `civic-world.js`, `cafe-activity.js`, `interior-visits.js` | Café/bakery/services, food tickets, NPC service/visitors and seats; city-life/cafe-service/local-life tests |
| `business-days.js`, `money-planner.js`, `city-errands.js` | Morning quotes/results, reservations/transfers and work steps; business-days/money-planner/local-life/story-flow tests |
| `wardrobe.js`, `clothing-world.js` | Paid catalogue, owned outfits/avatar changes and store; wardrobe/story-flow tests |
| `courier-jobs.js`, `courier-visuals.js`, `city-navigation.js` | Delivery state/receipts, parcel/markers, road/sidewalk routing; courier-jobs/courier-visuals/city-navigation tests |
| `characters.js`, `character-controls.js`, `character-grounding.js` | Asset/animation/IK, movement axes, jumping and contact; character-contact/controls/grounding/two-wheel-rider tests |
| `vehicles.js`, `vehicle-wheels.js`, `premium-vehicles.js`, `vehicle-fleet.js` | Vehicle assets/articulation/detail/reflections/fleet selection; vehicle-visuals/premium-vehicles/fleet-diversity tests |
| `vehicle-physics.js`, `vehicle-ownership.js`, `road-surfaces.js` | Handling/collision footprint, car ledger/upkeep, sampled road grip/grade; matching physics/ownership/road tests |
| `two-wheel-models.js`, `two-wheel-physics.js` | Ride construction/anchors/poses and bike/motorcycle dynamics; two-wheel-models/physics/rider tests |
| `traffic-signals.js`, `pedestrian-signals.js`, `traffic-safety.js`, `traffic-rhythm.js` | Signal cycles/meshes, yielding/crossing guards, city-time demand; traffic-flow/signals/safety/rhythm tests |
| `police-force.js`, `police-vehicles.js` | Officer roster/patrols, cruisers/livery/emergency lights; police-force/vehicle/story tests |
| `city-visuals.js`, `city-materials.js`, `city-atmosphere.js`, `architecture-detail.js`, `palm-trees.js` | PBR textures, terrain/trees/lighting and architecture detail; material/lighting/architecture/palm tests |
| `city-time.js`, `local-sky.js` | Displayed clock, presets, sun/night progression; city-lighting/local-life tests |
| `cinematic-renderer.js`, `graphics-recovery.js` | Effects/pixel budgets/adaptation and context-loss/startup recovery; cinematic-renderer/graphics-recovery tests |
| `city-camera.js`, `camera-geometry.js` | Collision-aware camera, comfort settings and architecture snapshots; city-camera and native interior tests |
| `city-audio.js` | Procedural audio/mix/settings/voices; city-audio/story-flow tests |
| `touch-controls.js`, `session-lifecycle.js` | Pointer ownership/contextual controls, pause/background/resume; touch-controls/session-lifecycle tests |
| `save-backups.js` | Bounded import/export, primary/checkpoint/recovery writes and validation; save-backups/story-flow tests |

No backend database, account service, authoritative multiplayer server, cloud economy or payment processor is part of the audited game. Three is the only declared npm dev dependency. Preserve `.glb`, compressed model and material files when checking out or packaging; a text-only snapshot cannot pass asset-dependent checks.

## State, saves and compatibility

Primary local story key: `mapleStreetChapter1`. Story serialization includes stage/goal/business/day, wallet/savings/earnings/spending, journal, reservations, wardrobe, car ownership/pose, two-wheeler state, city activity/food service, errands, deliveries, navigation, player X/Z, avatar and house/home-life state. Multi-level house visit data restores upstairs correctly and recovers blocked saved resting positions to a clear landing. Read the current serializer for exact field shape before adding a field.

| Local key | Purpose |
| --- | --- |
| `mapleStreetChapter1` | Story progress |
| `mapleStreetCheckpointV1` | Earlier periodic autosave checkpoint |
| `mapleStreetRecoveryV1` | Story before an import/reset |
| `mapleStreetCityLight` | Clock/light preference |
| `mapleStreetGraphicsV1` | Picture/road conditions |
| `mapleStreetAudioV1` | Volume/mute options |
| `mapleStreetCameraV1` | Camera comfort/distance |
| `mapleStreetTrafficV1` | Demand/horn preference |
| `mapleStreetHudV1` | Focus/HUD preference |

Save backups export a versioned file or accept legacy raw saves, with a preview before explicit Restore/reload/Continue. Device settings remain device-local, not in portable progress. Parsing is limited to 1 MB, with bounded depth/nodes/arrays/strings, supported versions/stages, validated numbers and refusal of markup/prototype keys. Character names must be escaped when displayed.

Import/reset recovery is separate from the periodic checkpoint. Failed recovery writes must not destroy a valid active story. Primary autosave can succeed even when checkpoint metadata hits quota. Read/import callbacks invalidate when panels close/change. After import/reset, old-page writes are suppressed to avoid overwriting replacement progress during pagehide. Export remains available when autosave fails. No device sync exists; file transfer is manual.

Hidden tab, blur, pagehide or supported freeze pauses input/simulation/render and flushes an active story once per away transition. Return preserves existing panels or shows compact Resume, without replacing the welcome screen. Graphics context loss similarly pauses and checkpoints before explicit Basic reload. An OS killing a process without lifecycle events can still lose recent progress; never promise guaranteed recovery.

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

For a requested runtime update, use the supported Sites source opening/credential/packaging/deployment workflow and preserve its audience. Do not store tokens, auth headers, user allowlists, temporary QA pages, scratch paths or diagnostic archives in this repository. A documentation-only PR does not require changing the hosted game.

`PREVIEW_SOURCE.md` links back to this guide and records the source/deployment distinction. README retains detailed chronological feature notes; its early “future work” statements can predate later home ownership. Update current summaries instead of treating historical paragraphs as an exact release manifest.

## Validation and known issues

### What the existing evidence establishes

- The GitHub baseline has 45 gameplay test files. This documentation initialization did not rerun those 45 or claim a new gameplay acceptance result.
- PR #41 reported all 47 hosted-layout test files passing with original binary assets. Earlier counts were snapshots at their respective PRs, not a count to reuse forever.
- Native Three tests construct actual meshes, inspect finite geometry/budgets, check paths, camera bounds, collision footprints and surfaces. Character tests load real rigs/clips with bitmap decoding mocked where appropriate.
- Story-flow fixtures execute actual handlers with a simulated DOM: business, money, ownership, stale/duplicate actions, saves and newer home guide hooks. A passing simulated panel is not a rendered 3D playthrough.
- Past browser/asset captures have shown some features under software rendering. More recent QA environments repeatedly cannot create WebGL, reaching the recovery screen instead. Do not generalize a past asset screenshot to a current full-game visual pass.
- Reported initial game crash/glitch and later mobile graphics error motivate the graphics recovery/memory work. No physical-device crash cause has been conclusively established here.

### Open issues / deliberate limitations

| Item | Status and next action |
| --- | --- |
| Doors do not open / no interaction guidance reported in a related project chat | Reproduce on the current published device build; distinguish first interactive home from decorative shells; inspect prompt visibility, targeting/LOS, input and animation/collision together |
| Attractive addresses on every home's front wall | Requested; current mailbox numbers and first-house plaques do not fulfill a complete front-wall pass |
| Weather/siren source divergence | Compare hosted source and current main before integration; restore corresponding imports/tests deliberately, not by overwriting unrelated work |
| PR #8 school/grocery/bus/Hudson/riverfront expansion | Historical merged PR describes these, but current main lacks its dedicated city-next test/module and several runtime identifiers; do not present the full package as currently playable without reconciliation |
| Full GPU/mobile acceptance | Still needed on actual iPhone/Safari and desktop; test first load, doors, stairs, shadows, frame stability, audio, touch, app switching and save recovery |
| Remaining homes/towers | Most remain exterior scenery; do not imply complete interiors or private ownership for all 27 |
| Premium visuals | Procedural materials/assets are an improvement; scanned materials, GTA-level fidelity, ray tracing, destruction and production streaming are not implemented |
| Physics/camera | Assisted kinematic simulation and conservative architecture bounds; not full rigid-body realism or automatic safety around all dynamic vehicles |
| Persistence | Browser-local plus manual backups; no multiplayer authoritative state or cross-device automatic sync |
| Documentation gate | Checks that the context actually changes per commit; cannot judge semantic completeness. Merge blocking requires the repository owner to mark the workflow check required in branch protection/rulesets |

### Regression checklist for the next runtime edit

Run targeted tests first, then the appropriate full suite once inputs settle. Validate syntax of the inline module as well as edited ES modules. Inspect changed geometry/camera/door gaps with native fixtures. For economy changes cover cancel, stale quote, duplicate submit, exact cents, wallet vs savings, migration and restore. For world changes cover real vehicle/player footprints, door/seat exits and shared navigation data. For mobile/UI changes check portrait/landscape, multitouch ownership, contextual actions, Escape/focus and app switching. For rendering changes measure buffer/draw/pixel budgets and report GPU/device limits explicitly.

## Roadmap and unresolved scope

### Immediate, grounded in owner feedback

1. Reproduce and resolve the reported door/prompt problem on the exact current build; add visible, contextual entry guidance and clearly distinguish decorative doors. Do not declare all doors fixed based only on a pure rules test.
2. Give every community home a durable address and a deliberate, readable exterior front-wall number treatment; preserve its mailbox, lighting and walkway access. Keep layout data as the address source.
3. Reconcile hosted weather/siren code with GitHub main and check older lost/stale expansion work before planning on top of it.
4. Complete device playtesting for startup/crash recovery, house entry/stairs/bed exits, mobile control visibility and scene performance.

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

### 2026-10-21 — Initialize maintained project context and update policy

- Request: make the repository understandable to any reader and keep context current after every change.
- Result: consolidated current product/architecture/state/UX/roadmap and all PR milestones in this document; added agent instructions, README/preview-source entry points, PR checklist, per-commit CI policy and focused policy tests. This is proposed repository work until its PR is merged.
- Evidence: audited main `1daa06fee727895b3ab422df3b972aa90d4adb62`, current imports/tree, README, home-life rules, asset provenance and PRs #1–41. Discovered GitHub/hosted weather/siren divergence and historical PR #8 features that cannot be assumed present.
- Affected systems: documentation and contributor/CI workflow only; no game, economy, asset, save or deployment behavior changed.
- Validation: `node --test tests/context-policy.test.mjs` passed all 11 cases against temporary Git histories, including staged edits, missing/empty/whitespace-only context, multiple commits, merged side branches, advanced main and invalid ranges. Both maintenance JavaScript files pass `node --check`. No new full gameplay-suite or physical-device claim.
- Remaining: merge this PR, make `Project context / context-current` required if merge blocking is desired, then update this document in every subsequent commit. Existing older commits are not retroactively rewritten.

### Historical milestones

The table below is generated from the repository's PR records reviewed on 2026-10-21. All listed PRs were merged, but current-source exceptions above still apply. PR bodies contain their original tests, limitations and detailed scope. These are implementation milestones, not a verbatim archive of every chat. No unseen conversation is claimed to have been reconstructed.

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
