---
name: security-review
description: Security boundary and safety review for the fictional cybersecurity game.
---

# Security Review

This game must remain a simulation.

## Forbidden functionality

Never implement:

- real network scanning
- arbitrary host connections
- packet transmission
- real exploit execution
- credential attacks
- malware
- payload execution
- persistence mechanisms
- privilege escalation against the host
- shell execution
- arbitrary code execution

## Dangerous APIs

Flag usage of:

child_process
exec
execFile
spawn
spawnSync
shell
eval
Function
WebSocket connections to arbitrary targets
arbitrary fetch requests

These require explicit architectural justification.

For the game engine, they should normally not exist.

## Terminal security

Treat terminal input as untrusted.

Never:

- evaluate it as code
- execute it as a shell command
- construct executable code from it

## Web security

Check for:

XSS
unsafe HTML
unsafe URLs
insecure state handling
exposed secrets
hardcoded credentials

## Secrets

Never commit:

API keys
tokens
passwords
private keys

Use environment variables where genuinely required.

## Review principle

When uncertain, prefer a simulated game mechanic over a real cybersecurity implementation.
