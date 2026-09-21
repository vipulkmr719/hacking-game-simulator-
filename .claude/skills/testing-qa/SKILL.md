---
name: testing-qa
description: Testing and quality assurance rules for Cyber Hacker Simulator.
---

# Testing & QA

Never claim a feature works without testing it.

## Unit tests

Test:

- command parser
- command validation
- mission state
- objectives
- detection
- rewards
- XP
- levels
- tools
- save/load
- puzzle logic

## Edge cases

Test:

- empty input
- invalid command
- invalid argument
- duplicate reward
- negative values
- maximum detection
- failed mission
- repeated mission completion
- corrupted state

## Integration

Test:

terminal
→ parser
→ game engine
→ mission state
→ UI

## UI

Verify:

- buttons
- navigation
- terminal input
- mission selection
- retry
- progression
- mobile layout

## Before completion

Run available:

- tests
- typecheck
- lint
- production build

Do not say "all tests pass" unless the command was actually executed.
