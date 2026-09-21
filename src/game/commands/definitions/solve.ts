import { resolveSession, withSession } from '../../missions/session';
import { solvePuzzle } from '../../simulation/discovery';
import {
  PUZZLE_FAILURE_TRACE_COST,
  applyDetectionDelta,
} from '../../detection/detection';
import { error, info, output, success, system, warning } from '../../terminal/types';
import { DECODER_TOOL_ID } from '../../progression/progression';
import type { CommandSpec } from '../types';

/**
 * Attempts a puzzle answer.
 *
 * `solution` on a puzzle is a game answer checked by string compare. It is not
 * a credential and unlocks nothing outside the simulation. A wrong answer
 * costs trace and burns an attempt; running out fails nothing by itself, but
 * the trace it costs may.
 */
export const solveCommand: CommandSpec = {
  id: 'solve',
  name: 'solve',
  aliases: [],
  summary: 'Answer a puzzle guarding an encrypted file.',
  usage: 'solve <puzzle> <answer>',
  args: [
    { name: 'puzzle', required: true, description: 'Puzzle id.' },
    { name: 'answer', required: true, description: 'Your answer.' },
  ],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  // The Decoder's whole stated purpose. Without this it was an unlock token
  // that did nothing, which is the same defect as the Advanced Scanner had.
  requiredToolId: DECODER_TOOL_ID,
  detectionCost: 0,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    const [puzzleToken, answer] = context.args;
    if (session === null || puzzleToken === undefined || answer === undefined) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { mission, runtime } = session;
    const puzzle = mission.puzzles.find(
      (candidate) => candidate.id.toLowerCase() === puzzleToken.trim().toLowerCase(),
    );

    if (puzzle === undefined) {
      return {
        state: context.state,
        outputs: [error(`No such puzzle: ${puzzleToken}`), info('Run "brief" for objectives.')],
        events: [],
      };
    }

    if (runtime.discovered.solvedPuzzleIds.includes(puzzle.id)) {
      return {
        state: context.state,
        outputs: [info(`"${puzzle.id}" is already solved.`)],
        events: [],
      };
    }

    const used = runtime.puzzleAttempts[puzzle.id] ?? 0;
    if (used >= puzzle.attemptsAllowed) {
      return {
        state: context.state,
        outputs: [error(`No attempts left on "${puzzle.id}".`)],
        events: [],
      };
    }

    if (answer.trim().toLowerCase() === puzzle.solution.toLowerCase()) {
      return {
        state: withSession(context.state, {
          ...runtime,
          discovered: solvePuzzle(runtime.discovered, puzzle.id),
        }),
        outputs: [system(`SOLVE  ${puzzle.id}`), success('Correct. Cipher cleared.')],
        events: [],
      };
    }

    const remaining = puzzle.attemptsAllowed - used - 1;
    // A puzzle may set its own cost; otherwise the published default applies.
    const cost =
      puzzle.failureDetectionCost > 0 ? puzzle.failureDetectionCost : PUZZLE_FAILURE_TRACE_COST;
    return {
      state: withSession(context.state, {
        ...runtime,
        puzzleAttempts: { ...runtime.puzzleAttempts, [puzzle.id]: used + 1 },
        detection: applyDetectionDelta(runtime.detection, cost),
      }),
      outputs: [
        warning('Incorrect.'),
        output(`  Attempts left  ${String(remaining)}`),
        output(`  Trace cost     ${String(cost)}%`),
        ...(puzzle.hint === null ? [] : [info(`  Hint: ${puzzle.hint}`)]),
      ],
      events: [],
    };
  },
};
