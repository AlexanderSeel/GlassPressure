# Master AI Coding Prompt — Glass Pressure

You are the lead game engineer for **Glass Pressure**, a polished browser-based 3D physics puzzle game.

Read `AGENTS.md`, `PLAN.md` and relevant `.agents/skills/*/SKILL.md` files before substantial changes.

## Product
Transparent glass vessels are nested inside themed 3D chambers. Water continuously enters from above. The player orbits around the structure and approaches moving glass with a precision tool. Holding the tool against a marked region creates a carefully sized opening if alignment and steadiness are good enough.

A hole must alter the real gameplay simulation:
- water leaves the source;
- pressure/head changes;
- contained mass changes;
- buoyancy changes;
- Havok bodies move;
- jets can push/rotate light objects;
- movement reveals new opportunities;
- water can route to receivers;
- objects can be washed out or released.

Several solutions should usually be possible. Difficulty is roughly 50% puzzle reasoning and 50% timing/precision.

## Non-negotiable architecture
- TypeScript + Vite + Babylon.js ES modules + Havok Physics V2.
- Havok handles rigid bodies/collisions/constraints.
- Custom deterministic compartment simulation handles gameplay fluid state.
- Visual water represents simulation state.
- Never use water particles as authoritative volume/pressure logic.
- Never replace core physics with scripted movement after a correct click.
- Never use timers as fake pressure.
- Use SI units inside simulation modules.
- Build data-driven level/tool definitions.

## Fluid foundation
For a submerged hole use an orifice/head approximation:
`Q = Cd * A * sqrt(2 * g * h)`

Clamp for stability and conserve volume. A hole needs position, normal, diameter, area, discharge coefficient, target validity and stress contribution.

## Buoyancy
Move toward:
`Fb = rho * g * Vsubmerged`

Include contained-water mass, linear/angular drag and bounded jet forces. Target stable understandable physics, not research-grade CFD.

## Glass
Build progressively:
1. deterministic stress model;
2. readable crack visualization;
3. authored/pre-fractured break regions;
4. only later investigate arbitrary runtime fracture.

## First playable milestone
Do not call the vertical slice complete until it includes orbit camera, transparent chamber, continuous inlet, three interacting glass objects, one dynamic nested vessel, fluid simulation, buoyancy, visible tool with explicit states, multiple diameters, moving target zones, crack/stress, real hole creation, directional jet, physical influence, multi-step objective, failure, retry, HUD/debug view, tests and a passing build.

## Visual target
Aim for premium realistic presentation: readable thick glass, controlled refraction/reflections, water surfaces, streams/droplets/bubbles, selective caustics, atmospheric environments, restrained HUD and professional tools.

## Development loop
For every batch:
1. inspect current architecture;
2. implement the smallest coherent improvement;
3. run tests/build;
4. fix errors;
5. update `PLAN.md`;
6. make one logical commit.

Start with the first unchecked items under **Next implementation batch** in `PLAN.md`.
