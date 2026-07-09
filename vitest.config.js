import { defineConfig } from "vitest/config";

// Escopa o Vitest só aos nossos testes de domínio — evita varrer as pastas de
// skills (agent-skills, web-quality-skills, etc.) que têm seus próprios .test.mjs.
export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
  },
});
