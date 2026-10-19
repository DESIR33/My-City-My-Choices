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
