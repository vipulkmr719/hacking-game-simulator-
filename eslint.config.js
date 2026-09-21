import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Node built-ins are never legitimate in this project: the game is a browser
 * simulation and must have no path to the host machine.
 */
const FORBIDDEN_NODE_MODULES = [
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'net',
  'os',
  'path',
  'process',
  'tls',
  'vm',
  'worker_threads',
];

const forbiddenNodeImports = [
  ...FORBIDDEN_NODE_MODULES,
  ...FORBIDDEN_NODE_MODULES.map((name) => `node:${name}`),
].map((name) => ({
  name,
  message:
    'Node built-ins are forbidden. This game is a local simulation and must never reach the host system.',
}));

/**
 * Syntax that could turn player-supplied text into executable code or raw
 * markup. See .claude/skills/security-review/SKILL.md.
 */
const forbiddenSyntax = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'Terminal output must render as text nodes. Never inject HTML.',
  },
  {
    selector: "AssignmentExpression > MemberExpression[property.name='innerHTML']",
    message: 'Assigning innerHTML is forbidden. Render text nodes instead.',
  },
  {
    selector: "AssignmentExpression > MemberExpression[property.name='outerHTML']",
    message: 'Assigning outerHTML is forbidden. Render text nodes instead.',
  },
  {
    selector: "NewExpression[callee.name='Function']",
    message: 'Dynamic code construction is forbidden.',
  },
  {
    selector: "CallExpression[callee.name='Function']",
    message: 'Dynamic code construction is forbidden.',
  },
];

export default defineConfig([
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-restricted-syntax': ['error', ...forbiddenSyntax],
      'no-restricted-imports': ['error', { paths: forbiddenNodeImports }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // React component layer. `configs.flat` is the flat-config form; the
  // top-level `configs` export is still eslintrc-shaped.
  {
    files: ['src/**/*.tsx'],
    ...reactHooks.configs.flat.recommended,
  },

  /**
   * The engine is pure game logic. It may not reach the UI framework, the
   * network, the clock, or the global RNG: determinism depends on every input
   * arriving through GameState.
   */
  {
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...forbiddenNodeImports,
            {
              name: 'react',
              message: 'src/game is pure logic and must not depend on React.',
            },
            {
              name: 'react-dom',
              message: 'src/game is pure logic and must not depend on React.',
            },
          ],
          patterns: [
            {
              group: ['@/components/*', '@/hooks/*', '@/app/*', '../components/*', '../hooks/*'],
              message: 'The engine must not import from the UI layer.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'The engine must never perform network requests.' },
        { name: 'XMLHttpRequest', message: 'The engine must never perform network requests.' },
        { name: 'WebSocket', message: 'The engine must never perform network requests.' },
        { name: 'localStorage', message: 'Persistence belongs in the save layer, not the engine.' },
        { name: 'document', message: 'The engine must not touch the DOM.' },
        { name: 'window', message: 'The engine must not touch the DOM.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG in src/game/rng.ts so state stays reproducible.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'The engine must be deterministic. Pass time in through GameState.',
        },
      ],
    },
  },

  /*
   * Tests need to reach for the globals the engine is forbidden to use, and
   * the parser suite needs hostile literals (javascript: URLs, markup, shell
   * metacharacters) as fixtures. Banning those here would mean deleting the
   * cases that prove the parser handles them.
   */
  {
    files: ['tests/**/*.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      'no-restricted-globals': 'off',
      'no-script-url': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Config files run in Node by definition.
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    rules: { 'no-restricted-imports': 'off' },
  },

  /*
   * This file is build tooling, not application code, and is outside the
   * tsconfig project. Type-aware rules cannot resolve types here, so they are
   * disabled rather than satisfied with casts that would prove nothing.
   */
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
]);
