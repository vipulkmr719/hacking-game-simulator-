# Playtest findings

Phase: first-time-player assessment.
Build: branch `claude/cyber-simulator-skills-ossrt1`, commit `78281f6`.

## Status of this document

**No human has played this build.** Every judgement about whether the game is
*fun*, *confusing* or *satisfying* is therefore marked **NOT HUMAN-VERIFIED**
and is not settled by anything in this document.

What *is* settled here comes from two mechanical sources:

1. **Browser verification** — 49 assertions driven through Chromium at
   320 / 768 / 1440 px. These establish what the build *does*, not how it
   feels.
2. **A deterministic campaign solver** — one optimal run of all ten contracts,
   instrumented with the playtest recorder. This establishes the *floor*: what
   the numbers look like for a player who never makes a mistake. A real player
   is strictly worse off than every figure below.

Neither source can tell you whether the game is enjoyable.

**This build is not ready for release.** See P0/P1 below.

---

## Severity

| | |
|---|---|
| **P0** | Prevents playing |
| **P1** | Seriously harms gameplay |
| **P2** | Noticeable but playable |
| **P3** | Polish |

No P0 issues were found. The game is completable start to finish.

---

## FIRST-RUN EXPERIENCE

### Machine-verified

The path **Main Menu → Player Profile → Contract Board → Contract 1 →
Mission Briefing → Start Mission** works at all three widths. Verified:

- A fresh profile opens on the Main Menu, not a half-started terminal.
- The profile shows LVL 1, XP 0, CR 500, REP 0 before anything is chosen.
- No contract is auto-started; no terminal input exists until one is.
- The menu points a new player at `01 First Connection` by name.
- The briefing shows number, title, client, difficulty, briefing text,
  objectives, rewards and any lock reasons.
- The briefing states the trace consequence: *"at 100% the contract is lost."*
- `Start mission` runs the engine's own `start`, not a parallel path.
- Typing `start <id>` in the terminal still works.
- A returning player lands in the terminal with `Progress restored`.
- No horizontal overflow at 320, 768 or 1440 px.
- Zero external network requests. Zero console errors or warnings.
- `window.__CHS_PLAYTEST__` is `undefined` in a production build.

### NOT HUMAN-VERIFIED

- Whether the Main Menu reads as an invitation or as an obstacle.
- Whether `Brief` is understood as *read about it* rather than *start it*.
- Whether the briefing is read or skipped.
- Whether a player understands what **trace** is before their first `scan`.
- Whether returning straight to the terminal (rather than the menu) is
  welcome or disorienting.

### Issues

**FR-1 (P1) — `help` lists all 20 commands, unfiltered.**
`Mission.availableCommandIds` is declared at `src/game/missions/types.ts:79`
and read by nothing in `src/game/`. Mission 1 curates six commands; `help`
renders `registry.all` (`src/game/commands/definitions/help.ts:5-18`), which is
twenty — including `connect`, `download`, `solve` (gated behind a tool the
player does not own) and `wait`. A first-time player's first `help` is a wall
with no indication which third of it applies.

**FR-2 (P1) — nothing tells the player the contract is finishable.**
When the last required objective completes, the reducer prints
`OBJECTIVE · <description>` and stops (`src/game/state/reducer.ts:238-247`).
The line *"All objectives met. Run "escape" to close the contract."* exists
only inside `brief` (`src/game/commands/definitions/brief.ts:42`). A player who
does not think to run `brief` is finished and not told, and the word `escape`
is never put in front of them.

**FR-3 (P2) — objectives are invisible outside the terminal.**
The StatusBar carries LVL / XP / CR / REP / TRACE but no objective state. Once
the briefing scrolls out of the log, the only route back to the objective list
is remembering `brief`.

---

## MEASURED REFERENCE CAMPAIGN

One optimal solver run. **This is a floor, not a playtest.**

| # | Contract | Cmds | Invalid | Peak trace | CR in | CR out | Spent on |
|---|---|---|---|---|---|---|---|
| 1 | First Connection | 9 | 0 | 35 | 500 | 750 | — |
| 2 | Open Ports | 8 | 0 | 31 | 750 | 1070 | — |
| 3 | Hidden Service | 8 | 0 | 25 | 1070 | 1520 | decoder (900) |
| 4 | Encrypted Archive | 8 | 0 | 24 | 620 | 1260 | — |
| 5 | Suspicious Logs | 8 | 0 | 24 | 1260 | 1980 | — |
| 6 | Restricted Server | 12 | 0 | 62 | 1980 | 2860 | forensic-kit + advanced-scanner (1950) |
| 7 | Corporate Network | 16 | 0 | **91** | 910 | 2160 | stealth-module (1600) |
| 8 | Security AI | 8 | 0 | 63 | 560 | 2060 | — |
| 9 | Multi-Stage Operation | 12 | 0 | 52 | 2060 | 3960 | analysis-toolkit (2000) |
| 10 | Final Operation | 15 | 0 | 83 | 1960 | 4960 | — |

Finish: level 11, 7,400 XP, 4,960 CR, 142 REP, 12/14 achievements,
104 commands, 0 invalid.

"Spent on" is attributed to the contract that had just ended — see **TECH-3**.
The purchase happens in the gap *after* that contract, which is why each row's
`CR out` minus the next row's `CR in` equals the spend.

`0 invalid commands` says nothing about human players. A solver knows every
command name and argument in advance.

---

## MISSION 1 FINDINGS — First Connection

Teaches `scan` → `ports` → `analyze` → `escape`. Nine commands, peak trace 35,
bonus (<50%) met.

- **FR-1** and **FR-2** land hardest here: this is the tutorial, and it is the
  contract where an unfiltered `help` and a missing extraction prompt do the
  most damage.
- The command chain self-documents well: `scan` ends with
  *"Use "ports <host>" to enumerate a host."*
- The bonus objective pays nothing — see **BAL-3**.
- NOT HUMAN-VERIFIED: whether a player finds `escape` unaided.

## MISSION 2 FINDINGS — Open Ports

Eight commands, peak 31, bonus (<45%) met.

- **GP-1 (P2)** — mechanically identical to Mission 1. Same six commands, same
  verb order, larger estate. No new idea is introduced.

## MISSION 3 FINDINGS — Hidden Service

Eight commands, peak 25.

- Adds *surface a weakness* via `inspect` — the only new verb across the first
  three contracts.
- Gates nothing, but the Decoder (900 CR) must be bought here to enter M4.

## MISSION 4 FINDINGS — Encrypted Archive

First puzzle, first `download`, first tool gate. Eight commands, peak 24.

- **PZ-1 (P1) — puzzle prompts are never rendered.** `Puzzle.prompt` is
  authored on all four puzzles and displayed nowhere; a search across `src/`
  finds only its type declaration (`src/game/missions/types.ts:53`). The player
  learns a puzzle exists only by attempting `download` on an encrypted file,
  which prints `Run "solve orion-cipher <answer>" first.`
  (`src/game/commands/definitions/download.ts:63`) — an id and a syntax, with no
  question attached. Here the question is recoverable from the service banner
  (`analyze` → *"Orion Archive 6.1.3 — cipher hint: WKUHH (shift of three)"*).
  On M5, M9 and M10 there is no banner question at all.
- **PZ-2 (P3)** — the answer is `three` and the banner says *"(shift of
  three)"*. A player who types the number they just read is correct without
  decoding anything.

## MISSION 5 FINDINGS — Suspicious Logs

Eight commands, peak 24.

- **PZ-1** applies with no banner fallback. The puzzle id is
  `blackstone-manifest`; the prompt *"What job name did the night shift file
  the manifest under?"* is never shown.
- The answer is stated verbatim in a log line (*"manifest filed under job name
  HARBOUR by night shift"*), so `logs <host>` hands it over — but only to a
  player who thinks to read logs on the right host, with no question telling
  them to look.

## MISSION 6 FINDINGS — Restricted Server

First `connect` (access escalation). Twelve commands, peak 62.

- The trace curve breaks here: 24 → 62 in one contract. `connect` costs 8 and
  is the first action that moves the meter meaningfully. See **BAL-1**.
- Entry requires the Decoder; exit effectively requires buying Forensic Kit
  (1200) and Advanced Scanner (750) to enter M7.

## MISSION 7 FINDINGS — Corporate Network

Sixteen commands, peak **91**.

- **BAL-2 (P1) — the Stealth Module is structurally unaffordable here.**
  M7's unlock requires `forensic-kit` + `advanced-scanner`, costing 1,950 CR.
  Credits after M6 are 2,860. That leaves 910; the Stealth Module costs 1,600.
  So M7 is *necessarily* run without the game's main trace-reducer, and the
  optimal path peaks at 91/100 — nine points from losing the contract with zero
  wasted commands and zero failed puzzle attempts. One extra `scan` (+5) or one
  extra `analyze` (+6) from a human who is exploring rather than solving loses
  the contract. This is the most likely place a first-time player loses a run
  they did nothing wrong in.
- **BAL-2b (P2)** — M7's bonus *"extract with trace below 70%"* is unreachable
  on the optimal path. The only trace-reducing mechanic is `wait` (−5, capped
  at three per contract), which still leaves 76.

## MISSION 8 FINDINGS — Security AI

Gates on the Stealth Module, now affordable. Eight commands, peak 63.

- With the x0.6 multiplier active, peak trace drops from 91 to 63 on a
  *harder* contract. The difficulty the player feels is set by purchase timing,
  not by contract design. See **BAL-1**.

## MISSION 9 FINDINGS — Multi-Stage Operation

Five staged objectives plus a cipher. Twelve commands, peak 52.

- Staging reads clearly in `brief` (*"Stage 1 —"*, *"Stage 2 —"* …). This is the
  clearest objective presentation in the campaign.
- **PZ-1** applies: keyword `SABLE-NINE`, in a log, prompt never shown.

## MISSION 10 FINDINGS — Final Operation

Fifteen commands, peak 83.

- **BAL-4 (P2)** — the finale's bonus *"extract with trace below 75%"* is
  missed on the optimal path (83). Two of the campaign's three late-game
  bonuses are unreachable by a perfect player.
- **PZ-1** applies: keyword `LANTERN`.

---

## BALANCE ISSUES

**BAL-1 (P1) — trace difficulty is a sawtooth, not a curve.**
Measured peaks: 35, 31, 25, 24, 24, 62, **91**, 63, 52, 83. Contracts 1–5 are
flat and quiet; 6–7 spike; 8 falls back. The shape is produced by *when tools
are bought*, not by how the contracts are designed.

**BAL-2 (P1) — Mission 7 is unaffordably tight.** See Mission 7 above.

**BAL-3 (P2) — bonus objectives pay nothing.**
`completeMission` collects `bonusObjectiveIds` (`src/game/missions/engine.ts:167`),
`escape` prints *"Bonus objectives met: N"* (`escape.ts:60-62`), and the value
is then discarded. No XP, no credits, no reputation and no achievement is keyed
to them. Six of ten contracts carry one. The game asks the player to work
quietly and pays them nothing for succeeding.

**BAL-4 (P2) — credits have exactly one sink and it is compulsory.**
Every tool is a hard `unlock.requiredToolIds` gate, and no mission ever grants
one (`reward.toolIds` is `[]` on all ten). There is therefore no purchasing
decision: buy what the next contract demands, in order, or stop playing. The
comment at `src/data/tools/index.ts:13` states the opposite — *"Every tool is
eventually granted free by the campaign; paying for one early is a choice"* —
which the shipped data does not implement. See **TECH-4**.

**BAL-5 (P2) — two of 14 achievements are unreachable by a competent player.**
`Operator` wants 250 commands; the whole campaign is 104 on the optimal path.
`Persistent` wants one lost contract. A player who plays well finishes at 12/14
with no route to the rest except wasting time or losing on purpose.

**BAL-6 (P3) — level gates never bind.**
The reference run finishes at level 11; the highest gate is level 8 (M10). XP
is a readout, not a constraint.

---

## UX ISSUES

**UX-1 (P1)** — `help` is unfiltered: 20 commands where 6 apply. *(= FR-1)*

**UX-2 (P1)** — no extraction prompt when objectives complete. *(= FR-2)*

**UX-3 (P1)** — puzzle prompts are never rendered. *(= PZ-1)*

**UX-4 (P2)** — objectives are invisible outside the terminal. *(= FR-3)*

**UX-5 (P2) — tool multipliers are shown, the combination rule is not.**
`inventory` and `buy` print each tool's multiplier (`x0.9`, `x0.6`, …). The
engine applies only the single *best* multiplier across owned tools
(`src/game/state/reducer.ts:94-95`: `Math.min(...owned.map(t => t.detectionMultiplier))`).
Nothing says so. A player owning the Forensic Kit (x0.85) and the Stealth
Module (x0.6) can reasonably expect x0.51 and gets x0.6.
*Documented, not redesigned, per instruction.*

**UX-6 (P2) — after the Stealth Module, three tools' trace stats are inert.**
Forensic Kit (x0.85) and Analysis Toolkit (x0.9) can never be the minimum once
x0.6 is owned, so their advertised trace benefit stops existing at the moment
the player buys the thing that makes it moot. They remain pure unlock tokens
while continuing to display a multiplier.

**UX-7 (P3) — `wait` is undocumented as the trace valve.**
It is the only mechanic that lowers trace (−5, three per contract). It appears
in `help`'s 20-item list and nowhere else: no contract mentions it, no trace
warning suggests it, and the per-contract cap is never surfaced.

---

## GAMEPLAY ISSUES

**GP-1 (P2) — Missions 1–3 are three tutorials.**
Same six commands, same verb order; `inspect` is the only addition across them.

**GP-2 (P2) — the campaign has one shape.**
Every contract runs `scan` → `ports` → `analyze` → (`inspect`) → (`connect`) →
(`solve`) → `download` → `escape`. The reference run's 104 commands contain
almost no branching. Difficulty varies by trace budget, not by approach.

**GP-3 (P3) — per-mission command curation does nothing.**
Ten missions each carry a hand-picked `availableCommandIds` list the engine
never consults. *(= TECH-1)*

---

## TECHNICAL ISSUES

**TECH-1 (P2) — `Mission.availableCommandIds` is declared and never read.**
Dead field. Drives FR-1 and GP-3.

**TECH-2 (P2) — `Puzzle.prompt` is declared and never rendered.**
Dead field. Drives PZ-1.

**TECH-3 (P2) — telemetry mis-attributes between-contract purchases.**
A purchase made after a contract extracts is folded into that contract's still-
open record, but `creditsAfter` on the same record was captured at extraction
and excludes it. On one record, `creditsAfter − creditsBefore` and
`creditsSpent` therefore describe different windows. Visible above: M3 shows
`CR out 1520, spent 900`, and M4 opens at 620. No other field is affected. Also
recorded in `docs/PLAYTEST.md` under *Known instrumentation caveats*.

**TECH-4 (P3) — stale comment describes an economy that is not implemented.**
`src/data/tools/index.ts:13`. See BAL-4.

---

## What the instrumentation cannot answer

The recorder counts commands, invalid commands, failed puzzle attempts, hints,
trace samples, credits and outcomes. It cannot observe:

- whether a player understood *why* something happened;
- where they hesitated, re-read, or gave up;
- whether the fiction landed;
- whether losing a contract felt fair or arbitrary;
- whether any of it was fun.

`docs/PLAYTEST.md` is the checklist for getting those answers from a person.
Every row in it is currently marked **NOT HUMAN-VERIFIED**.

---

## Verification gate

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint .` | clean |
| `vitest run` | 695 passed, 38 files |
| `npm run build` | 326.31 kB JS / 22.63 kB CSS |
| Browser flow, 320 / 768 / 1440 px | 49/49 passed |
| External network requests during play | none |
| Telemetry in production build | absent |
