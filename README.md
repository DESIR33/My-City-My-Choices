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
- **E**: interact, sit, or stand from a seat
- **F**: enter or exit a parked car
- **Touch phones/tablets**: left thumbstick moves; drag the city with another finger to turn the camera. Hold **Run** to sprint. Tap **Talk/Interact** or **Enter car** when nearby. While driving, drag the stick up to accelerate, down to brake/reverse, and sideways to steer; hold **Handbrake** to stop and tap **Exit car** to get out.
- Touch controls appear on devices with a coarse pointer or after actual touch input; desktop keeps keyboard/mouse controls. Menus pause movement. Losing focus or canceling a touch releases inputs. Portrait and landscape layouts include safe-area spacing and scrollable dialogs.

Run the control and police roster checks with `node tests/touch-controls.test.mjs`, `node tests/character-controls.test.mjs`, and `node tests/police-force.test.mjs`.

## Prototype scope

The current build is a single-player browser prototype. It includes a procedural city district with roads, buildings, a family home, a market, NPCs, traffic, a mini-map, and 20 CPU-managed police officers on sidewalk patrols. The east district has an explorable police station, three parked marked cruisers, and two patrol cars that follow the road grid and obey traffic controls. Officers wear navy uniforms and follow short patrol loops. Chapter 1 includes business-specific customer activities, money decisions, a welcome screen with player name and appearance choices, a saved story journal, and local save/continue. The chapter teaches coin and bill values, exact change, reading, and planning, and includes a downtown clothing and gear shop with persistent avatar purchases. The welcome screen uses original concept art; the playable city still uses prototype geometry and is below the supplied references' visual detail. Saves do not sync between devices. More business types and retail stores, online multiplayer, advanced real-estate simulation, and higher-fidelity character and building assets remain future work.


## City graphics

The city uses the pinned Three.js 0.180.0 renderer. `assets/city-visuals.js` provides original, deterministic surface textures, a physical sky and reflection environment, a local sun-shadow region, window interiors and glass, leaf-card tree canopies, and street furniture. Architectural surfaces use world-scale texture tiling, and static buildings and shop signs are merged by material to reduce draw calls. Detailed Mustang meshes use physical paint, glass, and metal materials.

The graphics pass also corrects the tower floor stack, porch supports, roof fascia, and home paths. Street details include curb blocks that stop at intersections, tactile pavement, connected benches, bins, drain grates, and manhole covers. Maple Homes has a physical office and matching interaction/map location outside the road.

The game remains a browser prototype with procedural architecture and textured rigged characters. Full WebGL visual QA requires a working browser preview; syntax and scene-geometry checks do not establish final visual quality or a frame-rate target.


## Human characters

The former cylinder people are replaced by six self-hosted, textured Microsoft Rocketbox character assets and compatible idle, walking, and running clips (MIT; notices in `assets/characters/`). The playable avatar uses a child mesh, while residents include varied adult and child models with independent skeletons. Skin, hair, shirt, and shoe customization preserves the underlying texture detail; curls, a bun, or the model's ponytail can be selected. Purchased hats and backpacks follow the animated head and torso. Motion retargeting keeps a child's native bone lengths, drops horizontal root motion, and blends movement states. Walking pace and the on-foot camera are adjusted for the child avatar.

`assets/characters.js` loads the meshes and animations, places feet at the actual road/sidewalk/path height, and retains a temporary fallback when an asset cannot load. Meshopt compression was expanded during asset preparation, so no runtime WebAssembly decoder is required. The models improve realism but are not custom scans or a likeness of the player; final facial/cloth rendering and frame rate still require browser visual QA.


## City color and landscape update

Buildings now use a varied brick, teal, ochre, and forest palette, with deeper street and lawn colors and reduced exposure/ambient fill. The block palette previously used coordinates whose remainder repeatedly selected the same colors; it now uses the block index. Neighborhood trees have textured bark, connected branches, dense leaf sprays, and three varied canopy types. A 470-tree forest uses six shared instance batches on a continuous rolling terrain skirt, outside the drivable district. Its bases follow the same terrain height function.

Phones use a 1.25 pixel ratio cap and 1024-pixel sun shadows; desktop retains its higher resolution settings. This is a quality budget, not a verified mobile frame-rate guarantee. Browser visual and physical-device touch QA are still required.


## Vehicle design and handling

`assets/vehicles.js` normalizes the supplied Mustang to approximately 4.72 m long, 2.02 m wide (including mirrors), and 1.36 m tall. Export remnants that distorted scaling and ground clearance are removed. The source wheels are split into four independently animated assemblies, with distance-based rotation, inner/outer front steering angles, tread detail, physical paint and glass, dark grille slats, brake lamps, and reverse lamps. A shaped coupe with windows is available during loading. Geometry is shared across cars.

`assets/vehicle-physics.js` uses fixed substeps, a wheelbase steering model, a lateral grip cap, progressive pedals, drag/coasting, brakes, a short direction-change delay, and damped body pitch/roll. Automatic gears and RPM appear beside speed. Steering lock reduces at speed; a moving car must stop before the player exits. Road and object collisions use the rotated vehicle footprint, including bumpers, and traffic leaves space around nearby cars. The chase camera eases behind the vehicle and temporarily yields to manual camera input. Keyboard and touch use the same simulation.

Run `node tests/vehicle-physics.test.mjs` for acceleration, braking, reverse, grip, collision, and 30/60/120 Hz checks. This is a lightweight road-driving model with visual load transfer, not a full rigid-body or deformable-car simulation. Final appearance and handling feel still require browser/device playtesting.


## Maple Motors: ownership and running costs

After business day two, Maple Motors opens in the northwest neighborhood, at the orange map marker. Meet Sam on the forecourt at (-90, 105), compare two fictional used-coupe offers, review the full budget, then choose to buy or continue with a free community loaner. Purchases use wallet cash; goal savings stay separate. The purchased car is parked at the curb outside.

The used coupe costs $4, its next full refill costs $2, and a future service costs $0.75. The refreshed coupe costs $6, its next full refill costs $1.60, and service costs $0.50. Both include their first tank. These are story prices and fuel units, not real vehicle costs. Driving consumes fuel and condition; hard acceleration and fast cornering increase both. Low fuel and service warnings appear in the journal. An empty tank stops the engine, and condition at 30% or less reduces driving pace until service.

The garage sells up to two fuel units at once, billing partial fills in cents. Fuel and service require walking to the garage; its HUD button gives a route and status from elsewhere. Free roadside return brings the owned car and player back without restoring fuel, condition, or money. Free loaners remain available so transport expenses do not trap the player. Ownership, expenses, vehicle position, and a stopped driving state persist in local saves. Legacy saves continue without ownership costs.

`node tests/vehicle-ownership.test.mjs` checks purchases, upkeep, consumption, billing, and save migration. `node tests/story-flow.test.mjs` exercises the actual story and garage handlers with a simulated DOM through both business days and ownership recovery. It also verifies the existing close-panel, reopen-business, and restart buttons are connected. These checks do not replace browser rendering or physical-device touch QA.


## My city plan

After Mom's money lesson, the **My city plan** button opens the player's city phone. Five plans organize wallet cash for business supplies, home and bills, car care, treats, and unexpected needs. Plans are reminders inside the wallet; they do not create a second cash balance. The planner shows unplanned money or a shortfall, moves money to/from the selected savings goal, and lets the player change that goal without losing savings. Reservations and goals persist with the story.

Purchases use the matching reservation first. If shopping, a home payment, a car purchase/upkeep, startup/restock supplies, an upgrade, a pretend investment, or a savings transfer would leave other plans short, a choice screen shows the impact before spending. The player can wait or deliberately use planned cash; the journal records the decision and the remaining shortfall. Matching bill payments reduce their reservation so money is not counted twice. Plans are not hard spending locks, and goal savings never pay for purchases without an explicit transfer.

The startup lesson awards cash once. First supplies now use the actual wallet balance, so saving before meeting Maya cannot mint extra money. Repeated purchase confirmations and stale reviews cannot charge again.

Run `node tests/money-planner.test.mjs` for reservation, spending-preview, transfer, and migration checks. `node tests/story-flow.test.mjs` additionally covers plan choices across shopping and payments, startup cash conservation, saving and withdrawing, changing goals, shortfalls, cancel/confirm behavior, and plan save/restore. Browser/device visual QA remains outstanding because the managed preview is unavailable.


## Ongoing business days and morning stories

The business continues after day two. Choose **Plan next business day** from the day summary, city planner, or journal. From day three onward, morning stories cycle through a street fair, supplier prices, equipment repairs, rain, and new neighbors. Each offer shows its opening cost, sale price, customer count, revenue, and profit before payment. Chosen plans persist, and reopening a menu cannot reroll a story or charge twice. All four business types retain their own location and customer tasks.

An upgrade adds two customers to future days. Paying for an equipment repair adds another customer and changes later repair mornings into a recommendation story. Customers and tasks cycle safely for longer queues. Each served customer is paid once, including zero-change sales. The journal retains the latest 20 day results, with opening costs, revenue, profit, and order count.

When wallet cash is short, the neighbor noticeboard offers one $2 job after each business day. The player reads Sam's supply list and checks a payment before receiving wages; wrong answers give hints, and the same job cannot pay twice. Wages are separate from business revenue. This provides a route back to trading without resetting the story or spending protected goal savings.

Garden plans can be started again after a completed day. They mature when the promised business day starts, and cannot pay merely because a planning menu was opened. Taking the tutorial's day off records zero sales and costs.

`node tests/business-days.test.mjs` checks deterministic events, exact quotes, repairs/upgrades, customer limits, history, and save migration. The story-flow test now plays days 1–10 across all four business types, including long queues, persistent repairs, wage recovery, investment timing, and duplicate-payment protection. Browser visual and device QA remain unverified while the managed preview is unavailable.

## Café, seating, and emergency services

Maple Cafe is at the southwest central block (`-30, -34`). Walk through the open front doorway to explore its interior; the roof and outer walls cut away while inside. The terrace has tables, umbrellas, and chairs. Press E or tap Sit near chairs, benches, or the café sofa. Press E, tap Stand up, or move to stand. At the counter, review a menu and pay from wallet cash; insufficient funds cannot produce an order. Orders use exact cents, respect the money planner, show food at the counter, and save their receipts.

Maple Fire & Rescue occupies the eastern district (`150, -90`) with a detailed procedural fire engine and four uniformed firefighters. The police force retains 20 officers, a station, and five marked cruisers. Police markings and lights survive the detailed vehicle model loading. Civilian and patrol traffic move along both street axes and obey lights and STOP signs.

Collisions with a vehicle or solid object at 1.2 m/s or more stop the car and dispatch a police cruiser through the road network. Hold S or pull the mobile driving stick down to reverse, then steer away and continue. Crashes do not lock engines, require payment, or force a tow. The officer checks the reported location and returns automatically. Earlier saved crash-disabled vehicles are released for free when progress is restored. This remains a lightweight driving simulation.

The extra building row across storefront entrances is removed. Downtown buildings are moved off roads/sidewalks, and their approach paths are checked for obstruction.

Checks: `node tests/city-life.test.mjs`, `node tests/traffic-flow.test.mjs`, and `node tests/story-flow.test.mjs` cover payments, sitting/standing handlers, driveable crash reports, response travel, legacy recovery, traffic rules, and clear building approaches. Rendered visual quality, seated model appearance, and device performance still require browser playtesting.


## Northstar City and Maple Bakery

North is negative Z. Follow Maple Street's center road out of the neighborhood, continue along North Road, and cross the 220 m Rivergate River on the raised suspension bridge. The bridge has a supported deck, solid sloping approaches, railings, lamps, and separate walkways. Northstar Boulevard lies at `z=-1150`, about 1 km beyond the neighborhood edge: roughly 1–2 minutes by car or 8–10 minutes at a normal walking pace before stops. There is no travel shortcut; the road and footpaths are continuous. Movement bounds prevent crossing the river outside the bridge.

Northstar City has **15 named skyscrapers** (88–186 m), 30 lower-rise restaurants, apartments, offices, shops, and theaters, plus City Hall, Union Terminal, and Northstar Motors. Towers use stepped crowns, facade mullions, floor bands, warm windows, ground-level entrances, and clear approach plazas. The city has avenues, crosswalks, signals, street trees, pedestrians, and its own traffic. The lower-rise city buildings are exterior scenery. The bakery and existing café have accessible interiors. Instanced architecture and signal lenses, plus merged pole geometry, reduce repeated draw calls; mobile performance still needs device testing.

Use **World map** (desktop or mobile) or **M** on desktop to see both districts and set a destination. The local map changes district as the player travels. Northern owned-car positions persist in saved games, police reach northern incidents via the bridge, and vehicles follow the deck height and grade. Northstar Motors' roadside pump (`194, -1177`) sells fuel and service for an owned car parked nearby, using the existing wallet and planned-spending rules. A trip consumes actual fuel; community loaners keep their existing fuel policy.

Maple Bakery occupies its original address (`-42, -90`). A central terrace path leads through a real doorway to the counter; roof and outer walls cut away inside. Two umbrella tables and four usable chairs sit outside, with more seating inside. Read the menu, review the price and remaining cash, then pay for bread, croissants, muffins, or milk. Orders cannot use protected savings, produce food without enough wallet cash, or charge twice. Bakery receipts survive saving and old saves gain empty bakery history automatically.

Validation: `node tests/north-world.test.mjs` checks the 15 towers, footprints and entrance clearance, a full 1 km drive using the actual vehicle dynamics, river boundaries, bridge continuity, police routes, actual bakery collision geometry, seating, payment refusal/exact payments, and save migration. `tests/story-flow.test.mjs` additionally exercises bakery UI handlers, stale/cross-shop payment rejection, northern saves, and the working north fuel stop. All existing test suites and JavaScript syntax checks pass. Rendered visual quality and desktop/mobile playtesting remain unverified because the managed browser preview is unavailable.


## City light and night driving

The **City light** control opens daylight (3:00 PM), sunset (6:15 PM), and night (10:00 PM) presets. Choosing a preset holds that time; the optional day/night cycle completes a visual day in 24 real minutes. It pauses while menus are open or the page is hidden. Lighting preferences save separately from the story, so changing the time never starts a business day, changes money, or resets progress.

The physical sky, sun direction, shadow region, fog, exposure, ambient fill, and reflection brightness share one timeline. Night adds a moon and a single star batch. Selected neighborhood windows and Northstar windows glow after sunset. Registered street lamps have one instanced batch of soft ground pools; real nearby illumination is limited to four non-shadow-casting street lights on desktop and two on touch devices. The driven car adds two low beams, aligned with its heading and road grade. Moving traffic uses automatic emissive headlights and running tail lamps; parked cars turn their headlights off. Brake, reverse, and disabled-vehicle hazard states retain priority.

Vehicle rotation now applies road pitch before world heading, correcting northbound cars tilting downward on the bridge ramps. The existing static city reflection capture temporarily uses neutral daylight and restores the active lighting even if capture fails; subsequent time changes adjust reflection intensity rather than rendering six new cubemap views.

`node tests/city-lighting.test.mjs` checks presets, malformed and saved preferences, midnight/frame-rate behavior, menu/background pauses, actual menu handlers, real light budgets, headlights on bridge grades, model replacements, brake/reverse states, and reflection-capture recovery. All 15 test files pass, including the vehicle-exit and story regressions. The managed browser preview remains unavailable, so the rendered lighting, mobile layout, and physical-device frame rate still need playtesting.


## Civilian fleet diversity

The city uses a stable mix of 20 Ford Mustangs, 20 Mercedes-Benz GLS SUVs, and 10 McLaren Sennas, plus the five existing police cruisers. Twelve paint options span pearl white, silver, graphite, cobalt blue, cherry red, forest green, champagne, orange, teal, ivory, yellow, and burgundy. Each model receives several colors. Assignments repeat consistently after reload, with civilian slots counted separately from police so all three districts keep the mix. Nearby loaner prompts identify the loaded vehicle model.

The premium loader retains the existing Mustang rigs instead of replacing nearly every civilian car with the Mercedes. If a premium download fails, the remaining asset is mixed with the Ford. Paint changes reach actual body materials and remain independent per car. Purchased-car colors, vehicle IDs and positions, police livery, disabled states, wheel/brake behavior, and existing premium detail budgets are preserved. The Mustang now shares the city's reflection capture with the other brands. No additional models are downloaded.

`node tests/fleet-diversity.test.mjs` executes the real fleet loader with the shipped models and checks all 50 civilian assignments, all three districts, independent body colors, owned paint, police preservation, partial downloads, wheel/brake states, and premium detail limits. All 16 test files pass. New browser rendering and physical-device performance remain unverified because the managed preview supervisor is unavailable.


## Sunshore City: the southern coast

Open **World map → Sunshore City**, then follow Maple Street’s center road south. Coast Road continues from the southern neighborhood edge to the first Sunshore intersection at `z=1080`, about a kilometer away. The three-district map and the local mini-map include the new road, beach, ocean, buildings, and fuel stop. The Sunshore Beach destination points to a beach-access path on foot. The existing City light control offers sunset and night views of the neon strip.

Sunshore has a kilometer-long Ocean Drive, two inland avenues, seven connecting streets, 24 pastel art-deco building exteriors, warm windows and neon facade trim, and more than 100 sculpted palms. Curved ringed trunks and feathered crowns are shared in geographic instance batches. A gently sloping sandy beach meets an animated ocean with depth colors, wave normals, and soft moving foam. Twelve moving cars and three parked loaners use the existing three-brand fleet. Eight residents walk the promenade; two additional pedestrians use the boulevard’s signals.

The waterfront includes a raised promenade, six usable ocean-facing benches, umbrellas, loungers, bins, two lifeguard towers, information signs, marked crossings, and beach access through real gaps in a physical roadside guardrail. The beach is walkable; cars stay on roads and the sea is outside the movement boundary. Hotel approach paths remain clear of palms and furniture. The southern forest corridor is cleared and leveled, southern mountain scenery is removed, and the old grass bank is shortened so it cannot cover the ocean.

**Sunshore Motors** is on the west curb just past the entrance (`-15, 1114`). Bring an owned car nearby, get out, and interact with the pump for fuel or service. These use the existing wallet and transport plan; protected savings remain separate. Saved car/player positions work in the south, and crashes dispatch police along the actual connecting road and coastal street grid. Free community loaners and the existing roadside recovery remain available.

All 17 test files pass. `tests/coast-world.test.mjs` constructs the actual Three.js scene and checks road and footpath continuity, a 1.9 km drive using vehicle physics, road/building clearance, physical rail gaps, dry-beach/ocean boundaries, sand heights, clear entrances, palm and lighting geometry, coastal traffic signals, residents, seats, police routes, and saved car poses. Story tests exercise the actual fuel, refusal, save/restore, information-board, world-map, and destination handlers; fleet tests now check all 50 civilian slots. Browser rendering and physical-device performance remain unverified because the managed preview supervisor is unavailable.

## Maple Cafe service and building interiors

Maple Cafe has eight varied customers and a cashier. Customers pay from separate cent-based wallets, queue at the register, wait while the cashier moves to the espresso machine, receive their order, reserve a chair, eat or drink, and leave. Four patrons start dining indoors and on the terrace; arrivals keep the cafe active. Cash gestures, brewing steam, handover cups, consumption poses, and a live service board make the stages visible. Several cafe seats remain available to the player.

At the counter, press **E**, choose coffee, espresso, latte, or food, review the price, and pay with wallet cash. Close the panel to let service continue. The cashier processes paid tickets in order; return to the counter when notified and press **E → Collect**. Paid tickets, remaining preparation time, receipts, register totals, and held items survive saves. Pickup cannot charge or fulfill twice. The player carries a physical cup or meal and consumes it while seated. NPC payments are recorded separately from the player's budget and savings.

Cafe and bakery shells now remain visible when entered. The indoor camera stays inside room boundaries and below the ceiling, with warm ceiling lights and interior-facing wall materials. No complete wall or roof group is hidden on entry.

All 18 test files pass. Cafe tests construct the real Three.js scene, simulate service and returning customers, reconcile exact payments, check ticket migration and duplicate refusal, test physical pickup/consumption and exclusive seats, and exercise the real indoor camera around both rooms. Browser rendering remains unverified because the managed preview supervisor cannot start in this container.


## Rivergate Bridge and collision recovery

The bridge has a separate asphalt skin and lower structural slab, removing the coplanar concrete/asphalt overlap that caused flickering. Both 200 m ramps meet the flat roads and river span smoothly, with a maximum grade below six percent. Road, footpaths, curbs, markings, guardrails, signs, streetlights, and vehicle pitch share the same height profile. Paint follows the ramp instead of intersecting it.

Crashes stop movement at the last safe position without disabling either car. Reverse and forward remain available with keyboard or touch controls. Active reports are deduplicated, NPC cars pause briefly before continuing, and police return after checking the scene. Prior saved disabled cars recover for free; the owned car's crash-induced zero condition is raised enough to drive to service.

All 19 test files pass. `tests/bridge-surface.test.mjs` builds the actual Northstar scene, raycasts the asphalt and supports to prove separation, verifies upward faces and slope-aligned paint, checks grade transitions, and drives across in both directions. Story tests run the real collision/input/dispatch handlers through impact, reverse, forward, police clearance, and old-save recovery. Browser rendering remains unverified because the managed preview supervisor is unavailable.

## Thread & Sole and My wardrobe

Thread & Sole at `(42, 30)` is open from the first city day. Open **World map → Thread & Sole**, walk through the central glass storefront opening, and press **E** to browse. The enterable interior has clothing racks, display mannequins, a fitting mirror, a cashier, and warm ceiling lights. The indoor camera keeps the room visible and stays below its roof. Trees are excluded from its doorway and footprint.

The collection includes 14 purchasable T-shirts, jeans/trousers, sneakers, sun hats, and backpacks. Review the basket and choose **Buy & wear**; purchases use wallet cash and the existing spending plan, with savings kept separate. Prices and receipts use integer cents. Purchased items stay owned after reloading, and earlier shirt/shoes/hat/backpack purchases migrate automatically.

Use the **My wardrobe** button anywhere on foot to change between owned pieces for free, remove a hat or bag, or return to the original outfit. Top, trouser, shoe, hat, and backpack colors update on the actual avatar; the coastal top also has stripes. Buying several pieces in one category equips the last one and keeps all of them available. Clothes cannot be purchased remotely or while driving, and duplicate checkout does not charge again.

All 20 Node test files pass. Wardrobe tests cover every catalogue purchase, exact cents, affordability and duplicate refusal, saved ownership/equipment/receipts, old-save migration, free outfit changes, a clear physical store route, indoor camera bounds, and the actual character shader and appearance functions. Story tests exercise real store and wardrobe UI handlers, protected savings, remote-purchase refusal, and save/restore. Browser rendering remains unverified because the managed preview supervisor is unavailable.

## Natural coastal palms

The coastal corridor and Sunshore now share three distinct coconut and royal palm forms, with fuller layered crowns, broad folded leaflets, tapered curved trunks, textured ring scars/fibres, green crownshafts, a few mature fronds, and coconut clusters on nearby coconut trees. Darker leaf colors use correct color-space conversion rather than the washed-out pale green of the earlier mesh. Each placement has varied proportions and orientation; crowns have gentle, independently phased wind movement.

Bark maps are generated once and shared. Nearby trees use folded 3D leaflets; distant trees retain their silhouette with roughly 2,000 triangles each. Geographic instance batches keep draw calls bounded, and touch devices use a smaller high-detail radius. All existing palm placements and clear pedestrian approaches are retained, with collision sizes matching the fuller trunk bases. Wind pauses with the game.

All 21 Node test files pass. The new palm tests construct real Three.js geometry, inspect finite positions/normals, crown width, trunk taper, bark maps, near/far triangle budgets, complete instance coverage, mobile detail selection, and the real wind shader. Coastal tests still drive the full road without collisions and check hotel entrances and beach access. Mesh shapes were also reviewed in offline rendered previews. Browser rendering and physical-device performance remain unverified because the managed preview supervisor is unavailable.

### Bicycles and motorcycles

Eight free two-wheelers are parked across Maple, Northstar and Sunshore. World map → Cycle & Moto gives directions. Approach one and press **F** or **E**; touch players can use **Ride**. **W/↑** pedals or opens the throttle, **S/↓** brakes, **A/D** steers, **Space** applies the rear brake, **R+S** walks backward, and **F** dismounts when stopped. On touch, use the driving stick, Rear brake, Walk back + down, and Dismount. Bike locations and the mounted ride persist in the existing save.

The bicycle has animated cranks and pedals, freewheeling, power-limited acceleration and drag. The motorcycle has automatic gears, an RPM display and stronger acceleration/braking. Handling uses fixed physics substeps, a wheelbase steering model, a combined braking/cornering grip limit, speed/radius-based lean and bridge grade forces. Detailed original meshes include tyres, spokes/cast wheels, drilled discs, cables, forks, drivetrain/engine parts, mirrors and lights. Rider IK follows the actual grips, saddle, pedals and pegs, with automatic bicycle/motorcycle helmets. These are assisted game physics with automatic balance; they do not simulate manual clutch/countersteering, falls or a full real-world motorcycle suspension/tyre model.

Validation includes the shipped character skeleton, finite geometry and draw budgets, model articulation, both keyboard/touch flows, collisions and walk-back recovery, save/restore, slopes, and 30/60/120 Hz physics. Browser visual QA remains blocked by the cloud browser's disabled WebGL context; native Three geometry and gameplay checks run without that context.

### Cinematic architecture and roads

**Picture & roads** offers Cinematic, Smooth and Basic modes plus dry streets or **After rain**. Desktop Cinematic uses the pinned Three.js 0.180.0 add-ons: EffectComposer, GTAO contact shading, restrained HDR bloom, a light split-tone/vignette grade, OutputPass and FXAA. Smooth omits contact shading; phones never allocate its unused buffers. Basic renders directly. Sustained slow frames disable contact shading and lower render resolution. Quality and road conditions persist independently of the game save.

`city-materials.js` supplies shared, original, seamless colour/normal/occlusion/roughness textures for asphalt, concrete, brick, stone, stucco, roofing, siding and wood. Material tint, dielectric/metal behaviour and wet-road clearcoat use physical Three.js materials. UVs are projected in world metres after instance transforms so bricks and paving do not stretch over large buildings. These are procedural material approximations, not photogrammetry or downloaded scans. The bridge uses the same wetness settings as city streets.

`architecture-detail.js` adds rooftop mechanical units with plinths, louvers and ducts, roof hatches, parapet caps, secondary glazing/sills, wall bases, road edge lines and flush repaired joints. The north/coastal district fixture has 138 mechanical units, 1,280 facade panels and 8,067 instances in 185 geographically culled batches. Detail leaves the existing doors, walking paths and collision footprints intact. Northstar glass and coastal stucco/paving also use revised physical materials. The Flamingo work from main is preserved; its floor surface, elevator interaction/update and indoor camera are connected, while its exterior shell stays visible.

Road conditions affect actual car/bicycle/motorcycle grip and stopping distances. Cars now respond to bridge grade and combined braking/cornering grip. This extends the existing fixed-step driving model; it is not a rigid-body architectural destruction system or a full vehicle tyre/suspension simulator. Rapier was evaluated for future rigid-body work; replacing all current collision/vehicle controllers is outside this pass. No additional framework or package is required for the rendering improvements.

Checks cover deterministic PBR maps and normal lengths, shared memory/colour spaces, shader injection, wetness reversal, real composer assembly/resize/mobile fallback, sustained-frame adaptation, architectural geometry/budgets/culling, road surface height, dry/wet stopping, uphill forces, saved controls and existing gameplay. GPU shading, final image quality and device performance remain unverified: the managed preview starts, but this cloud browser has WebGL disabled. This upgrade targets a more polished browser game, not GTA 6 visual parity.

Rendering references: [Three.js post-processing](https://threejs.org/manual/pages/post-processing.html), [GTAOPass](https://threejs.org/docs/pages/GTAOPass.html). Physics framework reviewed: [Rapier character controllers](https://rapier.rs/docs/user_guides/javascript/character_controller/).

### City navigation and courier deliveries

Open **World map → City deliveries**, or browse deliveries at the help-wanted board. The morning pastry run pays **$1.25** (Maple Bakery → Maple Cafe); Across the river pays **$3.25** (Maple Cafe → Northstar Motors); Pastries by the ocean pays **$3.75** (Maple Bakery → The Flamingo). Accept one job, visit the pickup marker on foot and press **E / Collect parcel**, then follow the route and press **E / Deliver parcel** at the destination. A sealed parcel appears on the character while carrying it. Collection and handoff require an explicit nearby on-foot action. No deposit, deadline, penalty or cancellation fee applies.

Payments use integer cents, enter wallet cash, preserve savings, add to side-job earnings, and write a delivery receipt. Each contract pays once per business day. The active job, parcel phase, receipt history and lifetime earnings survive reloads; old saves start with no deliveries. Changing routes does not cancel a job. Use Follow this delivery to resume its route. Cancellation returns the parcel without payment; completed jobs reopen on the next in-game business day.

`city-navigation.js` builds connected road and sidewalk graphs for Maple, Northstar and Sunshore. The bridge is the only river crossing. A spatial index and bounded local path searches route walking approaches around actual static walls, furniture and guardrails. Road routes lead to parking approaches; after leaving a vehicle, guidance recalculates to the actual entrance. Turquoise route lines appear on the world map and minimap, alongside the next turn, remaining route distance, a rough travel-time estimate and a heading indicator. Wrong-way/off-route guidance, mode changes and saved destination selection are supported. Upper hotel floors direct players to the lobby elevator first. Route searches are throttled and do not run every frame. Routing offers guidance, not autopilot or guaranteed live traffic clearance; signals and moving cars still require the player's attention.

Bicycle/motorcycle left/right steering now matches walking camera axes and the car controls.

Validation: all 32 Node test files pass. New tests cover both graph modes, all delivery endpoints, bridge-only crossings, wall/street-furniture detours, left/right and wrong-way instructions, parking/arrival, recalculation, exact payments, explicit on-foot handoffs, duplicate/reload rejection, cancellation, new-day availability, old-save migration, visible parcel anchoring and saved route/UI handlers. Native district fixtures check routes against actual northern/coastal/cafeteria geometry. The actual generated world-map and dispatch panels were reviewed in browser layout fixtures. Full WebGL scene/device playtesting remains unverified; temporary QA pages are excluded from the published build.

### City sound

Open **Settings → Sound & volume** for master, ambience, vehicle and effects levels, plus a mute toggle. Preferences save independently of story progress. Sound initializes only after a pointer or keyboard gesture; browsers without Web Audio can continue silently. Hiding or leaving the tab suspends audio. Return and interact to resume. Story panels pause world sounds.

`city-audio.js` synthesizes original wind, surf, quiet café texture/crockery, car and motorcycle harmonics linked to RPM/throttle, rolling noise, bicycle chain texture, footsteps linked to actual travel, and pickup/collision cues. Ocean intensity follows coastal distance; interiors suppress surf and wind. Walking/running step spacing and sandy footfall filtering differ; seating, vehicles, blocked movement and teleports suppress steps. No external sound files, intelligible speech, ambient traffic simulation or microphone access. This is a procedural sound foundation; realistic recorded engines and spatial surround mixing remain future work. Eight continuous layers and at most eight short action voices bound resource use.

Validation: all 33 test files pass, including lazy activation, unavailable-context fallback, saved/clamped levels, mute, background suspension and interaction resume, bounded node/voice allocation, ended-voice cleanup, coastal/interior mixing, motion-based footsteps, teleport suppression and actual settings handlers. Browser QA confirmed gesture activation reports ready, mute toggles and keyboard volume changes in a fixture using the shipped sound module and handlers. Audible balance and full 3D playtesting remain unverified in this environment.

### Pedestrian-aware city traffic

Ordinary CPU traffic now yields to the player and nearby characters on the same road level, anticipating people walking into its lane. A swept travel limit prevents the next CPU step from clipping a person who suddenly steps out. Traffic accelerates again when the person clears; brake lamps stay illuminated while waiting. Sidewalk characters, upper-floor occupants, invisible actors and the mounted player are excluded where appropriate. Actor tracking rejects teleport velocities.

Crosswalk pedestrians check each proposed step against oriented car and two-wheeler footprints, pause without losing crossing progress, and finish crossings already started even after WALK changes. If a player-controlled vehicle has already encroached, an outward escape step is permitted. Crossings update before CPU predictions so both use the same frame's movement; this prevents unstable predictions and reciprocal waiting at variable frame times. Vehicle signal timings, player controls, crash recovery and traffic routes remain unchanged. This applies to ordinary CPU road traffic; player-driven and emergency-response vehicles still require attention.

Validation: all 34 Node test files pass. Tests exercise yielding and recovery on both axes and directions, persistent brake lamps, moving late crossings with alternating frame times, no pedestrian overlap, sidewalk/height separation, mounted-avatar exclusion, teleport rejection, oriented swept-step blocking, blocked-crossing recovery and escape from an encroaching vehicle. Existing red-light, stop-sign, queue, coastal and vehicle tests remain green. Full WebGL/device playtesting remains unverified in this environment.

### Compact HUD and Focus view

Gameplay now defaults to one **Menu** button, a small wallet badge and a single-line objective. An active route replaces the objective with one concise direction/distance cue; tap it or press M for the full map. The minimap, large brand/wallet panels, task checklist and permanent keyboard legend no longer occupy the play area. A compact speed readout appears while driving.

Open **Menu** (or Escape on desktop) for full objective/job instructions, wallet/savings/goal details, map, deliveries, wardrobe, journal, planning, Motors, time/lighting and picture/sound/road settings. Planning and Motors retain their story unlocks. **Focus view** hides the wallet, objective and route while leaving Menu and essential movement/vehicle controls available; the choice saves separately from story progress. Dialogs hide the play HUD, reset held inputs, support Escape and keep keyboard focus within their controls.

Mobile uses a smaller translucent movement stick and context-only buttons. Interact and Enter vehicle no longer occupy space when unavailable, and a nearby vehicle has only one entry action. Run, exit/dismount and braking remain available in their applicable modes. Safe-area insets and compact landscape placement protect the centre of the screen.

Validation: all 34 Node test files pass, including contextual touch buttons, one vehicle-entry action, driving/riding controls, consolidated menu access, escaped mission text, saved Focus view, panel visibility recovery and unchanged wallet/savings. Browser layout fixtures using the shipped HTML/CSS/menu handlers were reviewed at portrait-mobile, landscape-mobile and desktop sizes, including menu access, Focus view and resuming play. These fixtures verify HUD layout/interaction; full WebGL/device playtesting remains unverified. Temporary QA pages are excluded from publication.

### Camera visibility and comfort

The follow camera now checks a swept, padded path against a spatial index of individual architecture mesh bounds, shortens its view at an obstruction, and eases back when clear. Camera motion is checked again after smoothing, so orbit interpolation cannot cut through a nearby wall. A terrain check protects rising ground, room limits keep indoor cameras below ceilings, and teleports reset camera travel. Doors retain their actual gaps and low furniture retains its real height.

**Menu → Settings → Camera & view** offers **Steady** (default, fixed field of view), **Cinematic** (a subtle speed-related widening), and Close/Standard/Wide follow distances. Portrait screens use a wider vertical field of view to show more street. Preferences save independently of story progress; no new gameplay HUD controls are added. Walking, car and two-wheeler cameras share the collision-aware rig, while existing mouse/touch look and timed vehicle recentering remain available.

Architecture bounds are captured once before city batching and indexed in 16 m cells, rather than scanning the scene or casting through every triangle each frame. Characters and vehicles are excluded to prevent self-occlusion; this is conservative static architecture avoidance, not a full physics camera or dynamic-vehicle avoidance system.

Validation: all 35 Node test files pass, including swept thin-wall and doorway cases, low furniture, orbit safety, smooth obstruction release, near-wall escape direction, teleport resets, ceilings, terrain, portrait field of view, invalid preference fallback, actual saved menu handlers and dynamic-actor exclusion. Café, bakery, wardrobe and Flamingo tests run the shipped camera function with architecture snapshots from their actual scene fixtures. Browser phone-layout QA verified the camera menu, mode/distance selections and reload persistence. Full rendered WebGL/device camera playtesting remains unverified; temporary QA fixtures are excluded from publication.

### Traffic rhythm, congestion and horns

Traffic now follows the displayed city clock by default. Fictional weekday commuter demand ramps up from 6:30–10 AM (peak 8 AM) and 3:30–7:30 PM (peak 5:30 PM), with later weekend activity and extra Sunshore evening demand. Overnight roads are quieter. These are game design schedules, not real-world traffic forecasts. The real-clock mode uses the player's local weekday; held/cycling light modes use their displayed hour.

A reusable reserve pool adds up to 24 civilian cars on desktop or 12 on mobile, spread over existing Maple/Northstar/Sunshore/connector lanes. Peak demand activates more vehicles, reduces cruising speeds, increases following headway and introduces staggered queue restarts. Quiet periods reduce density; ordinary road traffic and signals pause while menus are open or the tab is hidden. Existing collision, intersection-exit, stop-sign and pedestrian yielding checks still apply. Vehicles enter only at clear locations away from the player during ongoing play; inactive cars cannot leave invisible road blockers. Loop re-entry checks vehicles, bicycles and people before wrapping. Parked vehicles and police are not removed by the density schedule.

Backed-up drivers occasionally sound original synthesized two-tone horns. Per-driver cooldowns of at least 35 seconds and a global eight-second interval prevent constant honking; the audio engine also caps voices and applies a 1.5-second horn cooldown. A driver explicitly obeying a signal or yielding to a pedestrian does not trigger an impatience horn. Horns fade with distance, pan with the camera, soften indoors, respect mute/vehicle volume and remain silent in menus/background. A bounded continuous traffic texture follows nearby visible car activity. No external sound assets or microphone access.

Open **Menu → Time & traffic → Traffic & horns** (also linked from Sound & volume). Keep **Follow city time**, preview rush hour/quiet roads without changing the clock, or switch horns off. Resume play for density changes to take effect gradually. Preferences save independently of the story. No persistent HUD elements were added.

Validation: all 36 Node test files pass, covering weekday/weekend/coastal demand, bounded pools, real population changes, blocked/near-player spawn refusal, pause handling, vehicle/pedestrian re-entry clearance, multi-car queues without overlap, staggered green-light recovery, cooldown-limited queue horns, red-light suppression, stereo/distance behavior, muted/paused audio, saved preferences and existing safety/vehicle/story tests. Browser phone-layout fixtures using the shipped traffic handlers verified preview selection and horn-setting persistence. Full rendered congestion/device performance and audible balance remain unverified. Temporary QA pages are excluded from publication.

### Portable saves and recovery

**Menu → Save backups**, also available on the welcome screen, exports a versioned My City save file and imports either that format or an older raw story save. Move the downloaded file to another device and choose Import backup there. The preview shows character, business day, wallet, savings, wardrobe count and story/delivery status before replacement. Cancel or an invalid file leaves active progress untouched. Confirming Restore writes the new save and reloads; choose **Continue saved story** on the welcome screen. This is manual file transfer, not cloud synchronization.

Backups include the existing story snapshot: money/plans, clothes, owned car, bicycle/motorcycle state, deliveries, location, receipts and city activity. Device-specific sound, camera, picture, traffic and HUD preferences stay local. Exports read live progress even when browser autosave is unavailable.

**Previous save** keeps the story from before the latest import/reset. **Recent checkpoint** is a separate earlier autosave, refreshed at most once per minute. Periodic checkpoints never overwrite the import/reset recovery slot. An import/reset cannot replace a valid current story if its recovery write fails; a primary write failure preserves the primary. Checkpoint/metadata quota failures do not prevent the primary autosave. Autosave failures now produce a throttled message with an export path instead of silently failing. Starting a new story retains recovery copies.

Import parsing is limited to 1 MB with bounded depth/list/node/string sizes, recognized versions/stages and validated core money/index/position types. Unsupported markup and prototype keys are refused; character names are displayed as escaped text. File reads are invalidated when panels change or close, and an import is applied only by the explicit Restore action. Recovery and imported states use the existing reload/Continue path rather than mixing two running worlds.

Validation: all 37 Node test files pass. New tests cover versioned/legacy round trips, invalid/oversized files, text/state checks, quota failures, primary preservation, separate/throttled checkpoints, reset recovery, real menu previews, cancellation, explicit restore, reload and unchanged in-memory progress during preview. Browser phone-layout fixtures using shipped handlers verified recovery preview, cancel and export initiation. Physical iOS file-provider sharing and a transfer between two physical devices remain unverified. Temporary QA fixtures are excluded from publication.

### Safer app switching and session pause

Switching apps/tabs, losing window focus, pagehide or a supported browser freeze event now pauses the entire animation loop and immediately flushes the current story once per away transition. Keyboard/touch input is cleared. Returning to a visible, focused game opens a compact Resume screen; an existing purchase, lesson, map or backup panel stays open. Welcome screens are not replaced. Background frames do not simulate or render, and menu frames pass zero simulation time to character/police updates as well as traffic. Real-clock lighting still follows wall time; visual cycling uses simulation time.

Intentional backup restore and New story suppress subsequent writes from the old document, protecting the imported save or cleared primary from pagehide and periodic autosaves before reload. Background saves use the existing local storage/checkpoint/error handling; they cannot guarantee recovery if an OS terminates a browser before delivering lifecycle events. This remains local/manual-backup storage, not cloud sync.

Validation: all 38 Node test files pass, including background-event deduplication, hidden/unfocused gating, BFCache return, freeze/resume, welcome-screen protection, actual Resume modal behavior, preservation of transaction panels and post-import/reset overwrite prevention. A phone-width browser fixture using shipped CSS, modal handlers and lifecycle module verified Resume, City menu and a synthetic switch/save/return. Full WebGL and physical-device OS app switching remain unverified. Temporary QA pages are excluded from publication.

### Jumping, shoe contact, surface sounds and motorcycle gearing

On foot, press **Space** or tap **Jump** on mobile. Run and Jump sit together at the bottom edge. A bounded vertical integration gives takeoff, gravity, landing and falling from a drop; no held-key repeat/double jump. Menus freeze vertical motion, and teleports, seats, vehicles and the hotel elevator reset/detach the vertical state appropriately. Vehicle Space still operates its brake. Horizontal world collision remains in force while airborne; jumping does not bypass walls.

Character animation now respects the player's airborne world height. For grounded standing/walking/running characters, the model's two foot bones are calibrated in its normalized bind pose, then shoe contact is lifted against each foot's local surface after animation. This prevents animation root motion or one foot reaching a raised curb from pulling the shoes below the surface. Seated and mounted poses retain their existing IK. Thin floor/sidewalk registration is preserved and large grass planes are also tagged with their surface kind.

Footsteps select the highest actual registered surface: asphalt, concrete, grass, hotel stone/tile or beach sand, with a separate wood sound profile available for future wooden floors. Sound profiles have distinct transient/filter/duration/volume; running increases strength. Airborne travel never produces steps. These remain original synthesized effects, not recorded shoe samples.

Motorcycles use a six-speed automatic transmission with wheel-linked engine RPM, individual ratios, shift hysteresis, a brief torque interruption during shifts, downshifts and neutral at rest. RPM and the existing engine audio now fall on upshifts instead of rising continuously with road speed. This is a game vehicle model rather than a manufacturer-calibrated motorcycle simulation. Bicycle gearing/braking and walk-back collision recovery stay available.

Validation: all 40 Node test files pass. Tests cover frame-rate-independent jump/landing/curbs/falling/teleports, actual public jump handlers, mobile Jump gating/callbacks, surface selection/profiles, airborne footstep suppression, all six motorcycle gears, RPM drops, downshifts and shift torque interruption. A local test loads the shipped child/adult skeletons and animation clips with real Three mixers and checks calibrated foot contact throughout walk/run cycles over a raised curb; only bitmap decoding is mocked. Browser phone-width controls QA verifies Jump activation and Run/Jump alignment plus mounted brake controls. Full rendered WebGL, audible balance and physical-device playtesting remain unverified. Temporary QA pages are excluded from publication.

### Playable vehicle horns and bicycle bells

Press **H** while driving/riding to sound a car horn, motorcycle horn or bicycle bell. On mobile the existing Jump position becomes **Horn** or **Bell** while mounted, so no additional permanent HUD button is added. Dismounting restores Jump. Accessible labels and the city-menu/entry control hints describe the action.

Three distinct original two-tone sounds use the existing vehicle-volume/master/mute controls and bounded one-shot voice pool. A separate 750 ms player cooldown prevents button/key-repeat spam without allowing an NPC queue horn to consume the player's input. Background/menu sound is suppressed. The handler unlocks audio from the actual gesture and rechecks the mounted source after that asynchronous step; dismounting or switching vehicles cancels a stale request. Turning traffic horns off silences NPC horns while leaving manual horns/bells available. Sounding a horn never overrides pedestrian yielding or signals.

Validation: all 40 test files pass in the hosted and GitHub layouts. Tests cover all three actual gameplay-handler vehicle types, on-foot/menu refusal, stale asynchronous requests, distinct oscillator tones, cooldown/no allocation on spam, audio silence gates, voice cleanup and contextual touch callbacks/labels. A phone-width browser fixture using the shipped controls verifies Jump-to-Horn switching and the Horn callback. Audible balance, full rendered WebGL and physical-device use remain unverified. Temporary QA pages are excluded from publication.
