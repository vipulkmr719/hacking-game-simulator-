---
name: simulation-engine
description: Rules for implementing fictional cybersecurity simulation mechanics.
---

# Simulation Engine

The simulation engine represents fictional networks and systems.

It does not interact with real networks.

## Fictional targets

Use fictional organizations and domains.

Examples:

acme.local
novabank.sim
helix.internal
orion.corp

These are game identifiers only.

## Simulated entities

The engine may represent:

- servers
- ports
- services
- users
- files
- vulnerabilities
- logs
- credentials
- access levels
- security systems

All are fictional game objects.

## Commands

Commands operate on simulation state.

Example:

scan

returns simulated information from the current mission.

It must never perform actual scanning.

## State transitions

Every action should have:

Input
→ Validation
→ Game rule
→ State change
→ Output

Example:

connect
→ validate target
→ check required condition
→ increase access level
→ generate terminal output

## Determinism

Use deterministic state wherever possible.

Randomness must be controlled and testable.

## Validation

Never allow:

- negative credits
- negative XP
- detection > 100
- detection < 0
- invalid mission states
- duplicate reward claims

## Errors

Invalid game actions should return controlled game errors.

They must never crash the application.
