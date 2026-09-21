---
name: terminal-ui
description: Build and maintain the simulated hacker terminal interface.
---

# Terminal UI

The terminal is the primary gameplay interface.

## Visual direction

Create a professional cyber-security terminal aesthetic.

Prioritize:

- readability
- hierarchy
- spacing
- responsive layout
- subtle animation
- clear status information

Avoid excessive neon/glow effects.

## Terminal behavior

Support:

- command input
- command history
- output history
- autocomplete
- clear
- scrolling
- keyboard navigation
- mobile keyboard input

## Commands

Commands are fictional.

Example:

help
scan
ports
analyze
inspect
logs
status
inventory
connect
decrypt
escape

## Command processing

UI sends text to the command parser.

The parser sends validated commands to the simulation engine.

The simulation engine returns a structured result.

The UI renders the result.

Never execute the input as JavaScript or an operating-system command.

## Output

Use structured terminal messages:

- INFO
- SUCCESS
- WARNING
- ERROR
- SYSTEM

Keep output concise and readable.

## Mobile

The terminal must work comfortably on touch devices.

Never require hover to perform an important action.
