# Skill: Testing, CI & Performance

Use for verification, optimization, regression protection and milestone sign-off.

## Test pyramid
1. Vitest unit tests for pure simulation.
2. Integration tests for level/tool/flow coupling.
3. Browser smoke tests once Playwright is introduced.
4. Targeted visual regression for stable scenes.

## Required checks
Before milestone completion:
- `npm test`
- `npm run build`
- no happy-path console errors
- no NaN/Infinity in simulation
- reset/restart returns clean state

## Performance
- avoid transient allocations in fixed-step loops;
- pool particles/fragments;
- cap debris;
- use collision proxies instead of render meshes;
- monitor transparent overdraw/draw calls;
- degrade visual water independently of gameplay simulation.

Document important trade-offs in `PLAN.md` or an ADR.
