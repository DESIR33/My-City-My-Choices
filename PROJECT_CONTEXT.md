# My City, My Choices — project context

Last updated: 2026-10-22 (America/New_York). Maintained project handoff, product brief, architecture guide, decision record and change ledger.

**Read this document before changing the project. Update it in every change commit, including fixes, assets, configuration, tests and documentation.** See [Maintenance contract](#maintenance-contract). This is the current-state guide; Git history and linked PRs retain implementation detail and earlier states.

## Start here

My City, My Choices is a single-player, third-person browser life-skills game. A child avatar learns to earn, budget, save, run a business and make deliberate spending decisions while exploring three connected districts. The city must feel like a place to live: believable homes, shops, neighbors, vehicles, public spaces and useful interactions. It is an evolving playable prototype, with a premium cinematic direction and a strong mobile/desktop usability requirement.

- Repository: [DESIR33/My-City-My-Choices](https://github.com/DESIR33/My-City-My-Choices).
- Private playtest: https://my-city-choices-play.jvazquez2022.chatgpt.site (owner access required; do not change sharing without a request).
- Audited GitHub baseline: `998c7523c36e45e65dbb8a732785f99d4de3b400`, through merged [PR #47](https://github.com/DESIR33/My-City-My-Choices/pull/47). Follow-up base is open [PR #48](https://github.com/DESIR33/My-City-My-Choices/pull/48), head `97fd6a53a8a79af51e1882b55217cbb8173007b1`. Its nearby house-guide marker is published in private Site version 67, source `c793a7bf14ac88d76c97253c798fdeedecff2fce`. This change adds saved textile styles and preserves the marker; final PR/publication outcomes are recorded in the handoff, not assumed merged.
- The repository serves root `index.html` and `assets/`. The separate Sites checkout serves `dist/index.html` and `dist/assets/`. They are related source layouts, not interchangeable directory trees.
- Current major feature: furnished 101 Maple Grove Lane, connected to renting/buying, improvements, daily reviews and an optional settling-in guide.
- Current neighborhood update: 27 illuminated front-wall address plaques, 79 shared animated neighborhood doors plus the furnished home's six doors, explicit desktop/touch entry prompts and a world-map address directory. Other homes now have walk-in unfurnished ground floors; only 101 Maple Grove has two furnished interactive floors. Actual-device stability and GPU playtesting remain priorities.
- Multiplayer, server-assigned properties, cloud save synchronization and a production real-estate economy are not built.

### Evidence and confidence

The current source tree, runtime imports, module code, README and PR history through #47 were reviewed for this document. A merged PR is historical evidence, not proof that all its changes remain in today's tree. Earlier implementation notes and test counts in README are chronological and can be stale. Use this document's current-state distinctions and inspect source before changing behavior.

**Runtime reconciliation:** merged PR #44 restored dedicated weather/siren modules and mobile-budget/recovery improvements from hosted source `d79f280a4fd3fa50aae6eb9b57e0a03ee4245059`, preserving PR #43's home/address work. All 80 shipped files matched across layouts, including binaries. The house guide and household audio each added a module; the current marker adds one more and makes all 83 runtime files match across the candidate layouts. Tests/docs remain layout-specific. Source parity does not establish live-browser or physical-device acceptance; rerun the comparison whenever either source changes.

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

The latest home-life work adds a personalized plaque and three visual projects without new collision boxes or lights. Earlier first-house-only geometry measurements (87 meshes / 11,130 triangles) are historical; PR #40 reported 99 meshes / 11,850 triangles after home-life additions. None of these numbers measure total game GPU memory or real frame rate.

House-guide plans are SVG built on demand from the actual house collision boxes, live household door bounds and action approach points. `HOUSE_ROOMS` groups actions and identifies the utility/main/second-bedroom/bathroom doors; update this metadata and its tests when changing the architecture. Plans are location diagrams, not computed walking routes. They do not draw a line through walls, move players, open doors or activate furniture. The shared neighborhood overhead garage door is outside the six household leaves shown. Closed exit-door hints take precedence before changing floors. No new scene meshes, lights, textures or render targets are allocated.

The separate in-world marker uses two fixed meshes (72 triangles total) sharing one unlit, translucent, front-facing material. Depth testing remains enabled; it adds no lights, shadows, textures or postprocessing targets. It is excluded from camera-architecture snapshots and adds no collision/navigation/shelter boxes. Target lookup is cached per house and segment checks inspect only that house's bounded collider list, not every scene triangle. Updates run after camera following and reuse the original geometry/material. This is a tiny rendering addition; native tests cannot establish its GPU appearance or device frame rate.


### Neighborhood entry and finding addresses

Every neighboring front/patio/garage door now has an animated shared-instance leaf, live height-aware collision, nearby addressed Open/Close labels and player sweep protection. The model-home garage uses the same system; its original six household doors remain separate. Mobile prompts are visible above the controls and the contextual button says Open/Close door or garage. The other homes have unfurnished ground-floor shells, registered wood floors and indoor camera limits; upper floors remain closed. Neighborhood door positions are session-local and reset closed on reload; furnished-home state retains its existing save contract.

All 27 front-wall plaques use one 1024-pixel number/street atlas with brass/dark backing and a night glow. Rendering, labels and the new **World map → Maple Grove · Find an address** directory share `COMMUNITY_HOMES`. The directory groups all addresses by street, routes on foot to exterior front walks and by vehicle to the spare driveway bay, and preserves selected address IDs through the existing navigation save. It adds no permanent HUD controls, charges or ownership changes.

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

Cinematic uses EffectComposer, optional GTAO, restrained HDR bloom, grading, OutputPass and FXAA. Smooth removes contact shading; Basic renders directly. Phones avoid unused AO allocation. Sustained slow frames reduce effects/resolution; render failure falls back. Physical-pixel caps prevent Retina/large screens from allocating oversized targets. Disabling effects disposes their targets. Neighborhood instancing historically reduced measured geometry/instance buffers by about 71% (13,771,288 → 4,002,976 bytes), not total GPU memory.

The camera checks a padded swept path against actual architecture bounds captured before batching, rechecks smoothed travel, limits terrain/ceilings and resets on teleports. Steady/Cinematic and Close/Standard/Wide settings persist separately. Do not collapse an entire building into one camera box that blocks real doorways. Moving house doors are excluded from stale static camera snapshots; physical player collision still follows them.

Local clock/sunset, held Day/Sunset/Night views and street/window/headlight behavior exist. Weather offers manual road conditions, Clear, Rain and Heavy rain with gradual intensity, road wetting/drying, overcast lighting and an optional streak effect. Rain uses one bounded line pool (240 mobile / 700 desktop) and an indexed roof-shelter lookup. Wet traffic slows, increases following gaps/waits, looks farther ahead when braking and checks downstream clearance without deleting traffic density. Weather owns road wetness only outside manual mode; pause, local-sky preferences and temporary reflection captures retain their separate contracts.

Mobile budgets cap procedural texture anisotropy at 2, use a 256-pixel grass texture and 512-pixel sun shadows, and reuse the sky environment rather than allocating a six-face HDR car reflection probe. These reduce allocation pressure; they do not prove the reported device crash is fixed. Graphics context restoration can request one Basic-mode reload, with a session-scoped two-minute cooldown against reload loops and a manual recovery action retained.

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
| `world-rules.js` | District bounds, bridge/coast heights, roads, community lots and shared playable constraints; world/navigation/community tests |
| `north-world.js`, `coast-world.js`, `flamingo-hotel.js` | Northern/coastal construction, interiors, elevator and surface contracts; north/coast/bridge tests |
| `planned-community.js`, `residential-doors.js`, `community-addresses.js`, `community-plaza.js` | Lots, plaques, dynamic doors, address destinations, landscaping and plaza/playground; community/address/door tests |
| `house-rules.js`, `landmark-house.js`, `home-life.js` | Stable property state, multi-level geometry, reachable-object choices/state labels, household actions, tenure/projects/guide; landmark-house/house-interactions/home-life/story-flow tests |
| `house-guide.js` | Room/action directory, floor classification, location cues and SVG plans from actual household bounds; house-guide/story-flow tests |
| `house-audio.js` | Original action sound profiles and cached, position/floor/door-aware sampling of saved household sources; house-audio/city-audio/story-flow tests |
| `house-target-visuals.js` | Saved-guide approach marker, floor/range/occlusion visibility and reusable scene resources; house-target-visuals tests execute the actual frame integration |
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
| `city-weather.js`, `rain-visuals.js`, `emergency-audio.js` | Weather persistence, wetness, indexed shelter, bounded rain rendering and spatial siren state; city-weather/emergency-audio tests |
| `cinematic-renderer.js`, `graphics-recovery.js` | Effects/pixel budgets/adaptation and context-loss/startup recovery; cinematic-renderer/graphics-recovery tests |
| `city-camera.js`, `camera-geometry.js` | Collision-aware camera, comfort settings and architecture snapshots; city-camera and native interior tests |
| `city-audio.js` | Procedural audio/mix/settings/voices; city-audio/story-flow tests |
| `touch-controls.js`, `session-lifecycle.js` | Pointer ownership/contextual controls, pause/background/resume; touch-controls/session-lifecycle tests |
| `save-backups.js` | Bounded import/export, primary/checkpoint/recovery writes and validation; save-backups/story-flow tests |

`scripts/check-source-parity.mjs` compares complete shipped inventories/hashes across the two layouts; `tests/source-parity.test.mjs` covers equal/missing/extra/changed files, binaries, invalid entry points, symlinks and CLI usage. `.github/workflows/game-tests.yml` runs the full Node suite on PRs and main pushes. It does not access the private Site or establish remote runtime parity automatically.

No backend database, account service, authoritative multiplayer server, cloud economy or payment processor is part of the audited game. Three is the only declared npm dev dependency. Preserve `.glb`, compressed model and material files when checking out or packaging; a text-only snapshot cannot pass asset-dependent checks.

## State, saves and compatibility

Primary local story key: `mapleStreetChapter1`. Story serialization includes stage/goal/business/day, wallet/savings/earnings/spending, journal, reservations, wardrobe, car ownership/pose, two-wheeler state, city activity/food service, errands, deliveries, navigation, player X/Z, avatar and house/home-life state. Multi-level house visit data restores upstairs correctly and recovers blocked saved resting positions to a clear landing. Read the current serializer for exact field shape before adding a field.

Optional `houseGuide: {targetId}` stores only a whitelisted furnished-object ID, independently from city navigation and settling progress. Old saves default to no target; invalid/removed/door IDs are dropped. The existing portable backup format carries it without a version change. Selecting, canceling and successfully using the target use normal story saves, and New story clears it. Tours and guidance are free; no ownership, wallet, savings or business-day change occurs.

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
| Remaining homes/towers | Other community homes now have unfurnished ground-floor shells and front/patio/garage access; upper floors and most towers remain scenery |
| Premium visuals | Procedural materials/assets are an improvement; scanned materials, GTA-level fidelity, ray tracing, destruction and production streaming are not implemented |
| Physics/camera | Assisted kinematic simulation and conservative architecture bounds; not full rigid-body realism or automatic safety around all dynamic vehicles |
| Persistence | Browser-local plus manual backups; no multiplayer authoritative state or cross-device automatic sync |
| Documentation gate | Checks that the context actually changes per commit; cannot judge semantic completeness. Merge blocking requires the repository owner to mark the workflow check required in branch protection/rulesets |

### Regression checklist for the next runtime edit

Run targeted tests first, then the appropriate full suite once inputs settle. Validate syntax of the inline module as well as edited ES modules. Inspect changed geometry/camera/door gaps with native fixtures. For economy changes cover cancel, stale quote, duplicate submit, exact cents, wallet vs savings, migration and restore. For world changes cover real vehicle/player footprints, door/seat exits and shared navigation data. For mobile/UI changes check portrait/landscape, multitouch ownership, contextual actions, Escape/focus and app switching. For rendering changes measure buffer/draw/pixel budgets and report GPU/device limits explicitly.

## Roadmap and unresolved scope

### Immediate, grounded in owner feedback

1. Confirm the new neighborhood door/prompt behavior on the reporting device; the source now supports addressed Open/Close actions and visible mobile guidance. Do not declare a device-specific issue resolved solely from native tests.
2. Playtest exterior address readability, door animations, directory guidance and empty-shell entry at day/night and phone/desktop sizes. The 27 front-wall plaque and address-data pass is implemented.
3. Keep runtime parity verified as each destination changes; audit older lost/stale PR #8 expansion work before planning on top of those historical claims.
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

The table below records reviewed merged PR milestones through #47. Current-source exceptions above still apply. PR bodies contain their original tests, limitations and detailed scope. These are implementation milestones, not a verbatim archive of every chat. No unseen conversation is claimed to have been reconstructed.

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
