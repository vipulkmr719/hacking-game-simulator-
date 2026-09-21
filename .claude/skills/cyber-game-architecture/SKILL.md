---
name: cyber-game-architecture
description: Architecture rules for a fictional cybersecurity simulation game. Use when designing or modifying the game's core systems.
---

# Cyber Game Architecture

You are designing a fictional cybersecurity simulation game.

## Fundamental rule

This is a GAME.

It must NEVER become a real hacking tool.

All cybersecurity functionality must be simulated locally.

Never:
- scan real IP addresses
- connect to arbitrary hosts
- send network packets
- execute shell commands
- execute exploits
- perform credential attacks
- download payloads
- execute downloaded files
- interact with real security infrastructure

## Architecture

Separate the project into:

- UI layer
- Game engine
- Mission engine
- Command parser
- Simulation state
- Progression system
- Save system
- Audio system

UI components must not contain core game logic.

Game logic must be deterministic and testable.

## Data-driven design

Missions, commands, tools, rewards and vulnerabilities should be represented as data.

Avoid hardcoding mission logic inside React components.

## State

Centralize game state.

Player state may contain:

- level
- xp
- credits
- reputation
- inventory
- unlockedTools
- completedMissions
- achievements
- statistics

## Safety boundary

The terminal is an interface to the simulation engine.

It is NOT a real shell.

Never pass player terminal input to:

- child_process
- exec
- spawn
- shell
- subprocess
- eval
- Function
- arbitrary HTTP requests

## Engineering principle

Prefer:

simple → deterministic → testable → maintainable

over:

complex → clever → difficult to test.
