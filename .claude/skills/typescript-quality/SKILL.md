---
name: typescript-quality
description: TypeScript engineering standards for the game.
---

# TypeScript Quality

Write maintainable production-quality TypeScript.

## Rules

Prefer:

- strict typing
- interfaces/types
- small functions
- pure functions
- explicit return types where useful
- reusable modules
- descriptive names

Avoid:

- any
- unnecessary type assertions
- giant components
- duplicated logic
- magic numbers
- deeply nested conditionals

## Architecture

Separate:

UI
Game logic
Simulation
Data
Persistence

## Error handling

Handle expected failures explicitly.

Never silently swallow errors.

## Validation

Validate external/user input before using it.

Terminal input is always untrusted.

## Dependencies

Do not add a dependency unless:

1. It solves a real problem.
2. The existing project cannot reasonably solve it.
3. It is compatible with the current stack.

Before adding dependencies inspect package.json.

Never invent package names.
