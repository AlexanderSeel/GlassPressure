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

**Multi-hole persistence:** every drilled opening is permanent for the level unless the glass itself breaks. Opening a second/third hole must never close, replace, or visually suppress an earlier one. Each hole keeps its own flow value, stream/drips, outlet position and contribution to total outflow/pressure.

Initial outflow:
`Q = Cd * A * sqrt(2 * g * h)`

### Buoyancy
`Fb = rho * g * Vsubmerged`

Dynamic receiver bodies use submerged-volume buoyancy plus drag. The lower receiver now has a cylindrical ring of Havok wall proxies matching the visible glass, multiple dynamic spheres share the same water surface and collide through Havok, and transferred water drives a small deterministic receiver current so floating bodies drift into physical contact rather than remaining in isolated vertical columns.

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
- [x] hold-to-drill on full colored target patch (not only ring edge)
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
- [x] clear drilling progress in-world + HUD
- [x] monotonic drilling progress; release never moves progress backwards
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
- [x] source overflow routed into lower receiver
- [x] multiple simultaneous holes supported by fluid model and rendered independently
- [x] directional jet force + visual
- [x] contained-water weight coupling on nested dynamic vessels
- [ ] center-of-mass approximation
- [x] live fluid/body telemetry HUD

### M4 — Level framework
- [x] first data-driven level schema
- [x] first objective/failure evaluation system
- [x] restart/replay
- [x] data-driven drill target definitions
- [ ] level selection
- [ ] save progress
- [x] six handcrafted levels implemented

### M5 — Visual identity
- [ ] production glass strategy
- [x] dense dynamic water surface/slosh layer driven by authoritative fill state
- [x] first pooled flow droplets/bubbles driven by simulated outflow
- [x] first automatic Low/Medium/High render quality presets
- [x] level-driven six-face cubemap environment system
- [x] use active cubemap for PBR glass and custom water reflections
- [ ] replace development cubemaps with local licensed/CC0 production assets
- [x] first lightweight caustics approximation
- [ ] Botanical Atrium production asset pass
- [ ] two additional production environment asset passes
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

## Concept fidelity reset — 2026-09-28

The previous prototype drifted too far toward a two-tank routing game. That is no longer the design reference for Level 1.

The canonical first-level loop is now:

1. A **single tall outer glass chamber** contains a smaller open parent cup.
2. Two physical glass bodies begin **inside that parent cup**, not in a separate receiver display. Their visible meshes are now cup/bell-shaped glass forms rather than generic balls, while simple hidden collision proxies remain underneath for stability.
3. Water enters the parent cup continuously from above.
4. As the water level rises, the nested bodies become buoyant, contact each other and contact the cup walls.
5. The player drills a marked transfer port in the parent glass to alter how quickly water escapes into the surrounding chamber.
6. The inner glass body rises into a reachable window; its own colored drill region becomes usable only then.
7. Drilling the inner body releases trapped water/weight.
8. Continued filling, buoyancy, current and body contact push the inner body over the parent rim.
9. Once clear of the rim it drops/moves into the surrounding chamber. **That escape is the Level 1 success condition.**

This nested-lift/escape sequence is the product-defining vertical slice. Later routing, rotating-ring and pressure experiments remain useful systems, but they must not replace this core fantasy.

## Water rendering correction — 2026-09-28

The previous water renderer still looked like a blue polygonal fill. The presentation layer is being corrected without changing the authoritative compartment simulation:

- water volume meshes are now **open-sided depth shells** with no fake solid top/bottom caps;
- the visible liquid top is a dedicated animated shader surface;
- the surface uses Fresnel-like edge response, moving specular highlights and procedural micro-normal motion;
- slosh tilt is spring-damped so movement carries momentum instead of snapping directly to body velocity;
- the inlet continuously injects concentric ripple energy at the impact point;
- nearby vessel motion injects local travelling disturbances into the surface;
- receiver water reacts to transferred flow and escaped-body motion;
- the numerical fill level remains authoritative; waves only perturb the rendered surface.

This is still a game-fluid renderer rather than full CFD, but it must visually read as a moving liquid rather than a scaled translucent cylinder. Parent-cup overflow now produces visible falling droplets from changing points around the rim, while drilled-hole streams continue to originate from their actual target position.

## Buoyancy/water coupling correction — 2026-09-29

The water surface and buoyancy previously used separate height formulas. That allowed a vessel to appear detached from the rendered water and made tuning misleading.

Corrections:
- source and receiver fill-to-height math now lives in one tested `WaterLevels` utility;
- rendering and buoyancy both consume those exact values;
- the parent cup collision wall ends slightly below the visible rim so dynamic cups cannot balance forever on the flat top of segmented wall colliders;
- Level 1 nested-cup mass/contained-water values are recalibrated so the cups are positively buoyant and settle partially submerged instead of becoming neutral/pinned;
- the primary floating cup mass is increased so it follows the waterline rather than shooting to the rim;
- the inlet is no longer a static cylinder: it is an animated curved stream with a moving impact point and droplets;
- the water surface is now a dense radial mesh, not a simple Babylon disc, so inlet/body waves physically deform interior vertices;
- inlet ripple origin follows the moving impact point.

## Stabilization pass — 2026-09-29

Recent fluid/interaction changes became too aggressive and made the prototype harder to evaluate. The current priority is predictable gameplay, not visual complexity.

Stabilization rules:
- drilling progress is monotonic: releasing the trigger never subtracts progress;
- moving targets may reduce drilling efficiency, but they do not force the drill state to retract merely because alignment briefly changes;
- Level 1 starts with genuinely low source water so nested bodies rest before buoyancy becomes strong enough to lift them;
- moving/rotating levels use slower, smaller host motion so a target stays drillable long enough to make visible progress;
- water geometry deformation is intentionally subtle;
- water is deformed in one place only (surface mesh), not again in the shader;
- shader highlights/ripples are reduced to avoid the glossy/noisy "blue terrain" look.

## Shader water reference pass — 2026-09-29

Reviewed the supplied Shadertoy references and adapted the useful ideas rather than copying full scene shaders:

- `MdXyzX`: use layered directional waves with one reusable height/derivative function. This is the primary basis for contained-cup water because it is cheap, scalable and supports analytical surface normals.
- `Xl2XRW` ("Where the River Goes"): use as a reflection/refraction quality reference only; its raymarched scene approach is too expensive and too global for many nested moving vessels.
- `lsXGzH` ("Spout"): use as a stream-shape reference for inlet/drilled jets; do not raymarch every water body.

Implementation direction:
- contained surfaces use a few low-amplitude directional waves in the vertex shader;
- the same wave derivatives produce the surface normal, avoiding unrelated fake normal noise;
- one localized damped radial ripple is driven by inlet/body impact position;
- CPU no longer deforms the water mesh each frame;
- authoritative physics water remains a flat fill plane; shader displacement is a small visual skin only;
- inlet uses a separately animated curved tube + droplets rather than a static cylinder.

## Drilling game-feel pass — 2026-09-29

The drilling interaction is no longer allowed to read like filling out a progress form.

Player-facing drilling feedback now comes primarily from the 3D world:
- the large filled progress disc is removed as the visual metaphor;
- the bore mark starts tiny and physically grows at the contact point;
- multiple fine radial crack branches appear progressively from drilling progress and local stress;
- the drill visibly vibrates while cutting and jolts on breakthrough;
- small glass/debris particles emit from the contact point;
- breakthrough briefly pulses the opening/ring;
- the HUD progress bar is hidden during normal play and remains only as internal state for tuning.

The water shader pass is also made visually legible through moving analytical normals affecting Fresnel/reflection/transmission, while keeping geometric displacement small.

## Environment / cubemap pass — 2026-09-29

The empty dark box is no longer the intended environment strategy.

Implemented:
- every handcrafted level now declares an `environmentId`;
- the environment scene can switch six-face Babylon `CubeTexture` skyboxes at runtime;
- all six current levels have distinct development cubemaps;
- switching levels changes skybox, clear color, floor tone, ambient light, key-light intensity and environment intensity;
- the active cubemap is assigned to `scene.environmentTexture`, so PBR glass receives level-specific reflections;
- the custom water shader now samples the same cubemap using its analytical moving surface normal, so shader motion affects actual reflected environment detail instead of only a hard-coded tint;
- `docs/SKYBOXES.md` defines the six-image naming contract and production licensing rules.

Current cubemaps are lightweight Babylon Playground assets used only to prove the pipeline. Production environments should be local optimized assets. Preferred final source direction is CC0 HDRI material converted to cubemap faces; Poly Haven candidates are documented in `docs/SKYBOXES.md`.

The environment must support the gameplay rather than obscure it: target contrast, glass edges and water surface readability take priority over scenic complexity.

## Water / vessel boundary pass — 2026-09-29

To make the liquid read around moving glass rather than only across the whole surface:
- primary and nested dynamic vessels now get a local meniscus/waterline ring at the exact authoritative water height;
- the ring stretches in the direction of horizontal velocity to read as a wake;
- the cue fades when the vessel is clearly above or below the surface;
- crossing the water surface with meaningful vertical speed produces a short expanding splash-ring pulse;
- these cues use the same `waterSurfaceForBody(...)` result as buoyancy, so the visible boundary and physics boundary stay aligned.

This is intentionally subtle and local. It should improve the perception of glass actually occupying and displacing water without reintroducing exaggerated global waves.

## Caustics pass — 2026-09-29

A first restrained caustics approximation now projects moving interference bands onto the floor under the chamber:
- no additional fluid simulation is introduced;
- intensity follows authoritative source/receiver fill;
- the pattern remains low-opacity and is intended as a moving light cue, not a dominant effect;
- it complements the cubemap-driven water/glass reflections and local meniscus/wake cues.

Later polish can make the caustics react more directly to the active water-normal field and shadowing, but the current version establishes the rendering hook without affecting gameplay.

## Splash / onboarding pass — 2026-09-29

Water-entry feedback now includes actual pooled particles in addition to the ring cue:
- vessels crossing the surface emit short-lived splash droplets;
- downward entries also seed a few underwater bubbles that rise and disappear at the surface;
- particles are bounded and reused, so this does not grow scene objects over time.

Level 1 now has a compact top-center coach that advances through the intended core loop:
1. let the parent cup fill;
2. drill the cyan parent transfer port;
3. watch the inner cup rise;
4. drill the purple inner release port;
5. let buoyancy/flow wash the inner cup over the rim.

The coach is hidden on later levels and is intentionally concise so the 3D interaction remains primary.

## Current state — 2026-09-28
Development is performed directly on `main`.

The first vertical slice now includes a deterministic fluid model, fixed-step timing, Havok rigid-body physics, submerged-volume buoyancy, a visible drill, alignment/steadiness-sensitive drilling, local glass stress, cracking/failure, replay/reset, live telemetry and directional flow feedback.

Level 1 is being rebuilt as `Nested Lift`, the canonical original-game vertical slice. Earlier two-tank routing behavior is retained only as supporting technology for later levels. The Level 1 drill sequence now centers on a parent-cup transfer port and an inner-vessel release port:
- **Parent transfer port** — controls transfer from the inner parent cup into the surrounding chamber.
- **Inner release port** — appears on the rising nested glass body and changes its trapped-water weight.
- **Parent pressure relief** — optional safer pressure-management route.

Both openings can coexist, so target order matters. Opening the pressure-relief vent first reduces the effective pressure contribution to main-drain stress and slightly improves drilling progress on the main drain, while transferring less water. Target approach quality is evaluated against the vessel surface normal obtained from a ray/mesh intersection, with a safe fallback for edge cases.

Level 2 (`Moving Pressure`) increases inlet flow, reduces target sizes and moves the entire upper vessel laterally/vertically, so the player must time approach and contact while the target moves. Level 3 (`Jet Routing`) adds two competing primary drains on opposite sides and requires the inner vessel to finish in a positive-X routing zone; the faster drain can therefore be the strategically wrong choice. `N` cycles between the current handcrafted levels.\n\nWater rendering now separates volume from surface: the transparent cylinder remains as a low-opacity depth/body representation, while a tessellated animated surface mesh follows the exact authoritative water height. The receiver surface ripples and tilts from transfer rate and rigid-body motion; the source surface reacts to inlet/outflow activity. This is still a game-fluid renderer rather than CFD, but it no longer reads as a rigid flat cylinder. Source inlet rates are calibrated to a visible gameplay timescale, excess source water is reported as overflow rather than deleted, and overflow is routed into the receiver. This means the upper water visibly rises, eventually spills into the lower basin, and the lower water level then changes the buoyancy/contact state of the floating bodies. Level 6 (`Gyro Nest`) is the first composite challenge: the source translates and rotates, the collar is tilted, pressure relief can make the high-pressure small targets safer, receiver fill must expose a nested vessel, that vessel must then be drained, and the main floating body must finish inside a narrow central X band. Level 5 (`Rotating Collar`) adds rotational host motion, a visibly tilted glass collar ring and four moving drill regions. Its objective constrains the floating body's final X position, so side drains can over-route while the smaller neutral drain or counter-routing strategies preserve the center band. Break fragments now have bounded lifetimes and share the quality-tier fragment budget across multiple break events; oldest or expired Havok fragments are disposed so repeated failures cannot grow rigid-body count without bound. Jet splash placement now uses a tested ballistic receiver-impact calculation with the same speed/gravity scale as the pooled flow droplets, so horizontal and oblique jets no longer splash at a generic straight-line point. Level 4 (`Nested Release`) introduces a second Havok-driven glass vessel with its own contained-water compartment. The lower receiver must fill enough to buoy this vessel into an accessible height range before its purple nested-release target can be drilled. Draining that target transfers the trapped water to the receiver, reduces the extra water-weight force on the nested body and applies a reaction force from its own outflow jet. An automatic Low/Medium/High quality preset now scales render resolution, glass refraction intensity, pooled flow-particle budget and bounded glass-fragment count without changing gameplay physics. A compact settings shell lets the player persist Auto/Low/Medium/High; changes reload the scene so every dependent rendering budget switches coherently. Catastrophic target failure now spawns a small authored set of Havok-driven local fragments rather than attempting arbitrary runtime mesh fracture. The old rigid jet cylinder has been replaced by a tapered, flow-pulsed stream renderer with a receiver splash ring. Target creation, crack visuals, material state, reset/failure rendering and ray-derived surface normals live in `DrillTargetRuntime`. HUD DOM binding/rendering is isolated in `HudController`. Level indexing, cycling, timing, host motion offsets and phase evaluation now live in the tested `LevelRuntime`. Static environment/camera/light/chamber construction is isolated in `EnvironmentScene`, and receiver collision proxy construction is isolated in `BasinCollision`, leaving `Game.ts` primarily as the coordinator between level state, physics, interaction and rendering.

Current interaction usability: the thin torus is no longer the only pickable geometry. Each target now has a full circular hit patch, hover feedback/cursor change, an in-world radial progress fill and a HUD progress bar/percentage so the player can see drilling progress immediately.

Level 1 testability: after the nested vessel is drilled/lightened, a bounded outward/upward wash-out force now guarantees a physical path over the parent rim instead of relying on random drift. In Vite development mode only, `T` advances useful Level 1 checkpoints (high fill -> nested target height -> near-rim state) so interaction/physics can be tested quickly without waiting through the entire fill sequence.

## Next implementation batch
1. [x] Rebuild Level 1 around one tall chamber + open parent cup + nested physical bodies.
2. [x] Add parent-cup Havok floor/wall collision so nested bodies can rise inside it and clear the rim.
3. [x] Use parent-cup water height for buoyancy while a body is inside the cup, then surrounding-chamber water after escape.
4. [x] Make Level 1 require drilling the inner nested body and physically escaping the parent cup.
5. Add a third nested glass object with a different visual shape so Level 1 demonstrates a true multi-layer nest, not only two bodies.
6. [x] Replace the first spherical nested visuals with open glass cup/bell forms while retaining stable spherical collision proxies.
7. [x] Add visual water transfer from parent cup overflow at the actual rim locations; drilled-hole streams already originate from the target position.
8. [x] Replace capped blue fill meshes with open-sided depth volume + dedicated animated liquid shader surface.
9. [x] Add persistent slosh, inlet ripple propagation and body-driven local water disturbances.
10. [x] Unify rendered and physical water-surface heights through tested shared water-level functions.
11. [x] Replace static inlet cylinder with animated curved stream + moving impact point.
12. [x] Recalibrate Level 1 floating-body masses so vessels track the waterline.
13. [x] Add a short Level 1 onboarding coach explaining: fill → parent drill → rise → inner drill → escape.
14. Add audio/haptic feedback for contact, drill breakthrough, glass stress and vessel collisions.
15. [x] Stabilize rotating/moving levels to slower, drillable target motion.
16. [x] Tone water waves down and move contained-water motion to layered directional shader waves with analytical normals.
17. [x] Replace form-like drilling progress with bore growth, fine crack branches, tool vibration, contact debris and breakthrough pulse.
18. [x] Hide the normal-play HUD drilling progress bar; world feedback is primary.
19. [x] Make directional-wave shader normals visibly affect reflection/transmission without increasing wave height.
20. [x] Add level-specific six-face cubemap skybox switching and use it for glass/water reflections.
21. [x] Document production skybox asset contract and CC0 replacement candidates.
22. [x] Add waterline/meniscus and velocity-stretched local wake cues around partially submerged vessels.
23. [x] Add surface-crossing splash-ring pulses plus pooled splash droplets and underwater bubbles.
24. [x] Add first lightweight animated caustics projection whose intensity follows authoritative water fill.
25. Replace development cubemaps with optimized local production skybox faces.
26. Only after Level 1 visually/mechanically matches the original concept, resume broader tool/environment polish.
