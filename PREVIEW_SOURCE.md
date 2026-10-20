# Playtest source

Repository: https://github.com/DESIR33/My-City-My-Choices
Current work: city navigation and courier deliveries, based on the merged cinematic-architecture update.

The private playtest includes connected road/sidewalk navigation, map route lines, turn guidance, parking-to-walking transitions and three saved courier contracts with exact-cent wallet payments, receipts and duplicate-payment protection. It retains the coastal/northern cities, café, wardrobe, rideable bikes, collision recovery, Flamingo interiors and cinematic materials/rendering.

Validation: all 32 Node test files pass. Navigation routes are checked against native district geometry; courier UI handlers exercise pickup, explicit handoff, saves, exact payouts, cancellation and business-day resets. Actual generated map and dispatch panels were reviewed in browser layout fixtures. Full WebGL scene/device playtesting remains unverified.
