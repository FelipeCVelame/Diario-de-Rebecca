// ESLint flat config — projeto PWA vanilla JS (sem TypeScript, sem bundler).
// app.js/sw.js rodam no navegador (globals de browser); src/domain é puro ESM;
// test/**/*.test.js roda sob Vitest (globals de node + describe/it/expect).
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "coverage/",
      "flutter_starter/",
      "agent-skills/",
      "web-quality-skills/",
      "bencium-claude-code-design-skill/",
      "claude-code-skills/",
      "planning-with-files/",
      "_backup_pre_git_sync/",
      "DiarioDoBebe.html",
    ],
  },

  eslint.configs.recommended,

  // App code (navegador)
  {
    files: ["app.js", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      // `firebase` vem do SDK compat carregado via <script> clássico no index.html.
      globals: { ...globals.browser, firebase: "readonly" },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // firebase-config.js (script clássico, não-módulo, só define window.FIREBASE_CONFIG)
  {
    files: ["firebase-config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.browser },
    },
  },

  // Service worker (globals próprios, sem `window`)
  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.serviceworker },
    },
  },

  // Testes (Vitest)
  {
    files: ["test/**/*.test.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.vitest },
    },
  },

  // Prettier por último (desliga regras de formatação conflitantes)
  eslintConfigPrettier,
];
