---
name: performance-optimization
description: Performance rules for the Cyber Hacker Simulator.
---

# Performance

The game should remain smooth on mid-range mobile devices.

## Priorities

Optimize:

- terminal rendering
- animations
- state updates
- large command histories
- mission transitions
- asset loading

## Avoid

- unnecessary re-renders
- expensive calculations during render
- huge DOM trees
- uncontrolled animation loops
- memory leaks
- unnecessary dependencies

## Terminal

Do not render thousands of individual DOM nodes for command history.

Use a bounded history or virtualization where appropriate.

## Animations

Prefer CSS animations when sufficient.

Use JavaScript animation only when necessary.

Respect:

prefers-reduced-motion

## Memory

Clean up:

- timers
- intervals
- event listeners
- animation frames
- subscriptions

## Measurement

Do not optimize based only on assumptions.

Use profiling or measurable evidence where possible.
