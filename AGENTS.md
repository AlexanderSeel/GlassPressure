# Glass Pressure — Agent Development Rules

This repository is built with AI-assisted development in mind. Every coding agent must treat this file as mandatory project guidance.

## Mission
Build a polished physics-driven browser game, not a scripted visual demo. Preserve the causal chain:

**inlet -> fluid state -> pressure/head -> hole flow -> mass/buoyancy -> rigid-body motion -> new player opportunity**

## Required working method
1. Read `PLAN.md` before substantial changes.
2. Read the relevant skill under `.agents/skills/`.
3. Work directly on `main` unless the user explicitly requests a branch or PR.
4. Keep commits logically grouped; do not commit every tiny edit.
5. Run `npm test` and `npm run build` through CI before declaring a milestone done.
6. Update `PLAN.md` when milestone state materially changes.
7. Never claim a visual or physics feature is complete while it is still a placeholder.

## Architecture boundaries
- Havok owns rigid bodies, contacts and constraints.
- The fluid simulation owns deterministic gameplay liquid state.
- Visual water represents simulation state; particles are never authoritative.
- Level rules/objectives are data-driven.
- Tool behavior is data-driven so drill, laser, punch, cutter and thermal tools can share infrastructure.

## TypeScript quality
- Strict TypeScript stays enabled.
- Avoid `any`; isolate unavoidable external-boundary usage.
- Keep physics math small and testable.
- Use SI units in simulation code.
- Clamp unstable numerical inputs explicitly.

## Gameplay rules
- Multiple valid solutions are a design goal.
- Never move vessels on scripted paths after drilling.
- Never use timers as substitutes for pressure/flow.
- Hole diameter must materially influence flow.
- Player steadiness/alignment must influence drilling and fracture stress.
- Failure must be readable.

## Performance
Target desktop first without architecting out touch/mobile.
- fixed-step, low-allocation simulation;
- bounded active body count;
- controlled transparent overdraw;
- pooled particles/fragments;
- no per-frame DOM reconstruction.

## Security and dependencies
- Use current stable packages, pinned intentionally.
- Avoid dependencies for trivial helpers.
- Never store secrets in the repo/client bundle.
- Imported 3D assets need documented license/provenance.

## Definition of done
A task is complete only when the real game path works, tests/build pass, the browser path has no known console errors, documentation is updated, and placeholders are identified.
