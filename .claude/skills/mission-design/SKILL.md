---
name: mission-design
description: Create structured fictional cybersecurity missions.
---

# Mission Design

Missions must be data-driven.

## Mission schema

Each mission should define:

id
title
organization
difficulty
briefing
objectives
target
availableCommands
requiredTools
puzzles
detectionRules
rewards
unlockRequirements

## Objective design

Objectives should be explicit.

Example:

1. Scan the fictional target.
2. Identify the simulated service.
3. Solve the authentication puzzle.
4. Retrieve the encrypted file.
5. Escape before detection reaches 100%.

## Mission states

Use:

LOCKED
AVAILABLE
ACTIVE
COMPLETED
FAILED

## Failure

Failure should be understandable.

Show:

- why the mission failed
- current progress
- retry option

## Rewards

Rewards may include:

XP
credits
reputation
tools
achievements

Do not reward the same mission repeatedly unless replay rewards are explicitly designed.

## Safety

All vulnerabilities and exploits are fictional game mechanics.

Never provide real exploit implementations.
