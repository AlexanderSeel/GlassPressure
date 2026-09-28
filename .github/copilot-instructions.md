# GitHub Copilot instructions for Glass Pressure

Read `AGENTS.md`, `PLAN.md` and relevant `.agents/skills/*/SKILL.md` files before architecture changes.

Keep the game physics-driven. Do not replace fluid/pressure/buoyancy with scripted animation or timer-based fake solutions.

Keep deterministic simulation separate from Babylon rendering. Use SI units. Add tests for new fluid/physics rules. Prefer strict TypeScript, focused modules and data-driven levels/tools.

For substantial work, update `PLAN.md` and keep commits logically grouped.
