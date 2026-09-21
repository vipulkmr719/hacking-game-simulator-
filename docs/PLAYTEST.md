# Human playtest checklist

Nothing in this file is filled in. Every row is **NOT HUMAN-VERIFIED** until a
person plays the contract and writes what actually happened.

Automated runs prove the campaign is *completable*. They cannot tell you
whether it is *understandable*, because the script already knows every answer,
never mistypes, and never wonders what to do next. Those are the only questions
this checklist exists to answer.

## How to run a session

1. `npm run dev`, then open the app in a private window so the profile is fresh.
2. Play from the Main Menu. Do not read the mission data first.
3. Keep the browser console open. After each contract run:
   ```js
   copy(JSON.stringify(window.__CHS_PLAYTEST__, null, 2))
   ```
   Paste it beside your notes. It records command counts, invalid commands,
   failed puzzle attempts, trace after every action, credits and retries.
4. Answer every question below **as it felt at the time**, not with hindsight.

A "no" is more valuable than a "yes". Write the moment you were confused, even
if you worked it out ten seconds later.

## Per-contract record

Copy this block once per contract, 01 through 10.

```
### Contract NN — <title>

Playtester:
Date:
Time to complete (wall clock):
Outcome:              completed / failed / abandoned
Retries:
Peak trace:
Invalid commands:
Failed puzzle attempts:

1.  Was the objective immediately understandable?          yes / no
    If no, what did you think it was asking?

2.  Was the next action obvious?                           yes / no
    Where did you stall, and for how long?

3.  Was the terminal output understandable?                yes / no
    Which line confused you?

4.  Was the puzzle solvable without guessing?              yes / no / n-a
    How did you find the answer? Did you guess first?

5.  Was detection fair?                                    yes / no
    Did you ever feel punished for exploring?

6.  Was the reward satisfying?                             yes / no

7.  Was the required tool obvious?                         yes / no / n-a
    Did you know you had to buy it, and where from?

8.  Was the contract too short?                            yes / no

9.  Was the contract too long?                             yes / no

10. Did failure feel fair?                                 yes / no / n-a

11. Did you know what went wrong?                          yes / no / n-a

Free notes — anything you said out loud while playing:
```

## Whole-session questions

Answer once, at the end.

- At what point, if ever, did you understand what the trace meter was for?
- At what point did you realise tools are bought rather than awarded?
- Did you ever open the Progression screen without being told to?
- Which contract was the hardest, and was it the one you expected?
- Did you ever not know what to type?
- Would you have kept playing past contract 3 if nobody had asked you to?

## Known instrumentation caveats

- A tool bought between contracts is attributed to the record of the contract
  you just finished, because that is the one still open when the purchase
  happens. Read `toolsBought` as "bought before the next contract".
- `hintsShown` counts puzzle hints printed after a wrong answer. There is no
  other hint system, so it will be zero for contracts without puzzles.
- Timings are milliseconds since the page loaded, not wall-clock times. Record
  wall-clock separately if you care about session length.
