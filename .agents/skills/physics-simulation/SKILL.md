# Skill: Physics & Fluid Simulation

Use for fluid compartments, pressure, flow, buoyancy, rigid-body coupling, jets, constraints and fracture stress.

## Principles
- Simulation state is authoritative; visuals consume it.
- Use SI units.
- Advance deterministic fluid state on a fixed timestep.
- Prefer conservation of volume and bounded forces over dramatic instability.
- Treat Havok as rigid-body physics, not fluid physics.

## Fluid compartments
Track capacity, volume, fill height, density, inlet/outlet connections, holes, overflow behavior, pressure/head and pose.

For a submerged opening start with:
`Q = Cd * A * sqrt(2 * g * h)`

Smooth/clamp near zero head.

## Coupling
- contained liquid contributes effective mass;
- external submersion generates buoyancy;
- add linear/angular drag;
- use bounded jet impulses;
- never teleport a vessel to simulate buoyancy.

## Testing
Pure numerical behavior requires tests: conservation bounds, no negative volume, diameter effect, unsubmerged-hole behavior and approximate fixed-step frame-rate independence.
