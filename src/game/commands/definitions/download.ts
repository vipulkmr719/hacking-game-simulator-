import { ACTION_TRACE_COST } from '../../detection/detection';
import { resolveSession, withSession } from '../../missions/session';
import { hostOfFile, resolveFile, retrieveFile } from '../../simulation/discovery';
import { meetsAccessLevel } from '../../simulation/types';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Retrieves a file into the player's possession.
 *
 * Nothing is fetched and nothing is written to disk: the file is a game object
 * and retrieval records its id in the discovered set.
 */
export const downloadCommand: CommandSpec = {
  id: 'download',
  name: 'download',
  aliases: ['get'],
  summary: 'Retrieve a discovered file.',
  usage: 'download <file>',
  args: [{ name: 'file', required: true, description: 'File name or id.' }],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: ACTION_TRACE_COST.download,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    const [token] = context.args;
    if (session === null || token === undefined) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { target, runtime } = session;
    const file = resolveFile(target, token);

    if (file === null || !runtime.discovered.fileIds.includes(file.id)) {
      return {
        state: context.state,
        outputs: [
          error(`No discovered file matches: ${token}`),
          info('Run "inspect <host>" to list files.'),
        ],
        events: [],
      };
    }

    if (!meetsAccessLevel(runtime.accessLevel, file.requiredAccessLevel)) {
      return {
        state: context.state,
        outputs: [
          error(`"${file.name}" needs ${file.requiredAccessLevel} access.`),
          info('Run "connect <host>" to raise access.'),
        ],
        events: [],
      };
    }

    if (file.encrypted && file.puzzleId !== null) {
      if (!runtime.discovered.solvedPuzzleIds.includes(file.puzzleId)) {
        const puzzle = session.mission.puzzles.find((p) => p.id === file.puzzleId);
        return {
          state: context.state,
          outputs: [
            error(`"${file.name}" is encrypted.`),
            output(''),
            output(`  Puzzle: ${puzzle?.prompt ?? 'unknown'}`),
            output(''),
            info(`Run "solve ${file.puzzleId} <answer>" to unlock it.`),
          ],
          events: [],
        };
      }
    }

    if (runtime.discovered.retrievedFileIds.includes(file.id)) {
      return {
        state: context.state,
        outputs: [info(`"${file.name}" is already retrieved.`)],
        events: [],
      };
    }

    const host = hostOfFile(target, file.id);

    return {
      state: withSession(context.state, {
        ...runtime,
        discovered: retrieveFile(runtime.discovered, file.id),
      }),
      outputs: [
        system(`DOWNLOAD  ${file.name}`),
        output(`  Source  ${host?.label ?? 'unknown'}`),
        output(`  Size    ${String(file.sizeBytes)} bytes`),
        success('Retrieved.'),
        output(`  ${file.contents}`),
      ],
      events: [],
    };
  },
};
