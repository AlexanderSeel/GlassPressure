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
- Vitest for deterministic simulation tests
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
Havok handles transforms, collisions, gravity, constraints, dynamic vessels and bounded debris.

### Fluid gameplay
Liquid logic is numerical and authoritative. Visual water follows the simulation.

Initial outflow:
`Q = Cd * A * sqrt(2 * g * h)`

### Buoyancy
`Fb = rho * g * Vsubmerged`

The current sphere prototype uses submerged-volume buoyancy plus drag.

### Glass stress
Stress responds to drilling duration, angle, pointer steadiness, diameter, pressure, wall thickness and accumulated local damage.

## Tool progression
Planned tools:
- micro diamond drill
- high-speed drill
- laser drill
- spring punch
- glass cutter
- controlled impact hammer
- thermal tool

## Milestones

### M0 — Repository foundation
- [x] Vite + strict TypeScript
- [x] Babylon.js + Havok
- [x] Vitest
- [x] CI
- [x] AGENTS.md and project skills
- [x] core plan
- [ ] package lock after first install committed

### M1 — First playable physics loop
- [x] orbit camera
- [x] transparent chamber
- [x] continuous inlet visual
- [x] nested glass prototype
- [x] deterministic fluid compartment
- [x] selectable hole diameter
- [x] hold-to-drill
- [x] fixed-step simulation
- [x] visible drill state machine
- [x] pressure/head-based outflow
- [x] lower-receiver accumulation
- [x] submerged-volume buoyancy
- [x] crack visualization and catastrophic failure
- [x] multi-condition win state
- [x] deterministic reset/retry
- [x] directional jet force + visual
- [ ] visual polish pass

### M2 — Robust drilling & glass
- [x] targets attached to vessel transforms
- [x] steadiness/alignment metrics
- [x] local target stress model
- [x] crack rendering
- [x] geometry-derived surface normal via ray intersection with target vessel
- [x] angle gate before contact/drilling
- [x] first authored local break region with bounded physics fragments
- [ ] protected-object failure rules
- [ ] drill audio/haptics hooks

### M3 — Fluid routing
- [ ] compartment graph
- [ ] stream-to-receiver intersection
- [ ] overflow routing
- [x] multiple simultaneous holes supported by fluid model
- [x] directional jet force + visual
- [ ] contained-water mass coupling
- [ ] center-of-mass approximation
- [x] live fluid/body telemetry HUD

### M4 — Level framework
- [x] first data-driven level schema
- [x] first objective/failure evaluation system
- [x] restart/replay
- [x] data-driven drill target definitions
- [ ] level selection
- [ ] save progress
- [ ] six handcrafted levels (4 implemented)

### M5 — Visual identity
- [ ] production glass strategy
- [ ] dynamic water surfaces
- [x] first pooled flow droplets/bubbles driven by simulated outflow
- [x] first automatic Low/Medium/High render quality presets
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
Development is performed directly on `main`.

The first vertical slice now includes a deterministic fluid model, fixed-step timing, Havok rigid-body physics, submerged-volume buoyancy, a visible drill, alignment/steadiness-sensitive drilling, local glass stress, cracking/failure, replay/reset, live telemetry and directional flow feedback.

The first two levels are now data-driven. Level 1 has two drillable regions:
- **Main drain** — larger effective opening, lower on the vessel, best for moving significant water.
- **Pressure relief** — smaller high opening that can reduce pressure with lower transferred volume, giving the player a safer preparatory option before drilling the main outlet.

Both openings can coexist, so target order matters. Opening the pressure-relief vent first reduces the effective pressure contribution to main-drain stress and slightly improves drilling progress on the main drain, while transferring less water. Target approach quality is evaluated against the vessel surface normal obtained from a ray/mesh intersection, with a safe fallback for edge cases.

Level 2 (`Moving Pressure`) increases inlet flow, reduces target sizes and moves the entire upper vessel laterally/vertically, so the player must time approach and contact while the target moves. Level 3 (`Jet Routing`) adds two competing primary drains on opposite sides and requires the inner vessel to finish in a positive-X routing zone; the faster drain can therefore be the strategically wrong choice. `N` cycles between the current handcrafted levels.\n\nThe water meshes and basin geometry remain prototype quality; they represent deterministic state but are not yet production fluid rendering. Jet splash placement now uses a tested ballistic receiver-impact calculation with the same speed/gravity scale as the pooled flow droplets, so horizontal and oblique jets no longer splash at a generic straight-line point. Level 4 (`Nested Release`) introduces a second Havok-driven glass vessel with its own contained-water compartment. The lower receiver must fill enough to buoy this vessel into an accessible height range before its purple nested-release target can be drilled. Draining that target transfers the trapped water to the receiver, reduces the extra water-weight force on the nested body and applies a reaction force from its own outflow jet. An automatic Low/Medium/High quality preset now scales render resolution, glass refraction intensity, pooled flow-particle budget and bounded glass-fragment count without changing gameplay physics. Catastrophic target failure now spawns a small authored set of Havok-driven local fragments rather than attempting arbitrary runtime mesh fracture. The old rigid jet cylinder has been replaced by a tapered, flow-pulsed stream renderer with a receiver splash ring. Target creation, crack visuals, material state, reset/failure rendering and ray-derived surface normals live in `DrillTargetRuntime`. HUD DOM binding/rendering is isolated in `HudController`. Level indexing, cycling, timing, host motion offsets and phase evaluation now live in the tested `LevelRuntime`, leaving `Game.ts` primarily as the coordinator between physics, interaction and rendering.

## Next implementation batch
1. [x] Add a proper receiver-impact calculation so splash position follows curved/deflected jets.
2. Add fragment lifetime/pooling before allowing multiple break events in one level.
3. Add a manual quality override in settings after the settings/menu shell exists.
4. Extract static scene/chamber construction from `Game.ts` now that multiple dynamic vessel types exist.
5. Add level 5 around asymmetric chambers / rotating ring geometry.
6. Generalize nested-vessel collision geometry beyond the current fixed spherical proxy before level 5 depends on it.
