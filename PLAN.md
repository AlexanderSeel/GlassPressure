# Glass Pressure — Development Plan

## Vision
Glass Pressure is a premium physics-driven 3D web puzzle game about controlling water, pressure, buoyancy and fragile nested glass structures.

Water continuously enters a transparent apparatus. The player orbits around it, approaches moving glass with precision tools and creates carefully sized openings in marked regions. Every opening changes the system: water drains or forms jets, pressure equalizes, contained mass changes, buoyancy changes, vessels rise/sink/tilt, and previously inaccessible targets become reachable.

Difficulty is approximately **50% reasoning and 50% precision/timing**. Levels should normally support several valid solutions.

## Visual target
The game is presented inside themed 3D box environments with professional lighting, realistic transparent glass, readable refraction, water surfaces, streams, droplets, bubbles and selective caustics.

Planned environments:
- Botanical Atrium
- Dark Laboratory
- Ocean Observatory
- Desert Research Station
- Neon Night Lab
- Minimal White Gallery

## Technology baseline
Verified 2026-09-28:
- Babylon.js `@babylonjs/core` 9.28.0
- `@babylonjs/havok` 1.3.14
- Vite 8.3.1
- TypeScript 7.0.2

Architecture:
- TypeScript + Vite
- Babylon.js ES modules
- Havok Physics V2 for rigid bodies
- deterministic compartment/flow model for gameplay liquid
- mesh/particle representation for visual liquid
- Vitest for simulation tests
- HTML/CSS HUD initially

## Design pillars
1. Physics first.
2. Cause and effect must be readable.
3. Precision without arbitrary frustration.
4. Glass + water is the visual identity.
5. Systemic puzzles with multiple solutions.
6. Escalating geometry and tools.
7. Web-first performance; touch/mobile considered from the start.

## Core simulation

### Rigid bodies
Havok handles body transforms, collisions, gravity, constraints, dynamic nested vessels, bounded fragments and tool collision proxies.

### Fluid gameplay
Liquid logic is numerical, not particle-driven.

A compartment owns capacity, volume, fill height, density, inlets/outlets, holes, overflow connections, pressure/head and a pose/reference geometry.

Initial outflow:
`Q = Cd * A * sqrt(2 * g * h)`

Hole diameter must materially change the result.

### Buoyancy
Target model:
`Fb = rho * g * Vsubmerged`

Also model fluid drag, angular damping, contained-water mass, center-of-mass shift where useful and bounded jet impulses.

### Holes
A gameplay hole stores local/world position, normal, diameter, effective area, tool, edge quality, flow coefficient, stress contribution and target-zone validity.

Small holes equalize slowly. Large holes drain faster and form stronger jets while raising fracture risk.

### Glass stress
Progressive strategy:
1. deterministic local stress model;
2. procedural crack visualization;
3. authored/pre-fractured break regions;
4. runtime fracture experiments only after the core loop is stable.

## Tool progression
Architecture must support:
- micro diamond drill;
- high-speed drill;
- laser drill;
- spring punch;
- glass cutter;
- controlled impact hammer;
- thermal tool.

## Level rules
Per-level combinations can define success/failure:
- free selected nested objects;
- drain below a threshold;
- route water into a collector;
- wash an object out;
- preserve protected objects;
- use a limited hole count;
- stay below crack risk;
- avoid overflow;
- finish before a pressure/time condition;
- hit target zones in any viable sequence.

Harder levels can expose multiple targets where the obvious first choice is not necessarily optimal.

## Content progression
Early: simple bowls/cylinders, large targets, slow inlet, stable bodies.
Mid: tilting vessels, multiple compartments, protected glass, useful jets, alternate drill orders.
Late: spirals, double chambers, rotating rings, suspended glass, asymmetrical buoyancy, multiple inlets and tight timing.

## Procedural mode
Generate constrained puzzle graphs, never arbitrary impossible geometry:
1. choose environment;
2. choose vessel graph;
3. establish containment/connectivity;
4. choose dynamic bodies;
5. choose target regions;
6. run candidate simulation;
7. reject unstable/unsolvable candidates;
8. estimate difficulty from motion, flow, target size and solution flexibility.

## Milestones

### M0 — Repository foundation
- [x] Vite + strict TypeScript
- [x] Babylon.js + Havok
- [x] Vitest
- [x] CI
- [x] AGENTS.md and project skills
- [x] core plan
- [ ] package lock after first install

### M1 — First playable physics loop
- [x] orbit camera
- [x] transparent chamber
- [x] continuous inlet visual
- [x] nested glass prototype
- [x] deterministic fluid compartment
- [x] selectable hole diameter
- [x] target zone
- [x] hold-to-drill prototype
- [x] pressure/head-based outflow
- [x] first rigid-body force coupling
- [x] first jet reaction coupling
- [x] visible drill model with approach/contact/drill/breakthrough/retract states\n- [ ] surface-normal alignment and physical contact validation
- [x] fixed-step accumulator independent of render FPS
- [x] submerged-volume buoyancy for the first dynamic sphere
- [x] crack visualization and catastrophic failure
- [x] first multi-condition objective completion
- [x] deterministic reset/retry flow
- [ ] visual polish pass

### M2 — Robust drilling & glass
- [ ] raycast surface position/normal
- [x] target zones attached to vessel transforms
- [x] steadiness/alignment metrics
- [x] local target stress model
- [x] crack rendering
- [ ] authored breakable regions
- [ ] protected-object failure rules
- [ ] drill audio/haptics hooks

### M3 — Fluid routing
- [ ] compartment graph
- [ ] stream-to-receiver intersection
- [ ] overflow routing
- [ ] multiple simultaneous holes
- [ ] improved jet force
- [ ] contained-water mass coupling
- [ ] center-of-mass approximation
- [ ] debug fluid inspector

### M4 — Level framework
- [ ] level schema
- [x] first objective/failure evaluation system
- [x] restart/replay for vertical slice
- [ ] level selection
- [ ] save progress
- [ ] six handcrafted levels

### M5 — Visual identity
- [ ] production glass strategy
- [ ] dynamic water surfaces
- [ ] streams/splashes/bubbles
- [ ] quality tiers
- [ ] caustics approximation
- [ ] Botanical Atrium
- [ ] two additional environments
- [ ] polished tool models

### M6 — Additional tools
- [ ] laser
- [ ] cutter
- [ ] punch
- [ ] hammer
- [ ] thermal tool
- [ ] per-glass compatibility

### M7 — Procedural challenges
- [ ] constrained generator
- [ ] validation simulation
- [ ] seeded challenges
- [ ] difficulty estimator
- [ ] endless UI

### M8 — Mobile/performance/release
- [ ] touch interaction
- [ ] mobile quality tier
- [ ] performance budgets
- [ ] accessibility pass
- [ ] browser matrix
- [ ] deployment pipeline

## Current state — 2026-09-28
Foundation implementation on `feat/vertical-slice-foundation` includes Babylon/Havok bootstrap, orbit camera, glass chamber, nested puzzle prototype, numerical fluid compartment, continuous inlet, selectable prototype hole sizes, hold-to-drill target, crack-risk accumulation, real simulation hole creation, first outflow-driven force coupling and HUD.

The force coupling and water meshes are explicitly first-pass approximations. They prove the causal architecture but are not production buoyancy or water rendering.

## Next implementation batch
1. Add fixed-step simulation accumulator.
2. Replace coarse drain boost with submerged-volume buoyancy.
3. Build a visible drill with aim/approach/contact/retract state machine.
4. Attach targets to vessel surfaces and compute normals.
5. Add crack visualization + catastrophic failure.
6. Add level state machine with success/failure/retry.
7. Add debug overlay for volume, fill, head, flow and body velocity.
