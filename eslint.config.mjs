/**
 * ESLint configuration for Chronodex.
 *
 * Owner: Agent 1 (Core). Implements MASTER.md section 8.4 rule 9: an exported function, class,
 * type, interface or constant without a doc comment fails `npm run check`.
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsdoc from "eslint-plugin-jsdoc";

/** Node types that must carry a doc comment when exported (MASTER.md 8.4 rule 2). */
const DOCUMENTED_EXPORTS = [
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSEnumDeclaration",
  "ExportNamedDeclaration > VariableDeclaration",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,mts}"],
    plugins: { jsdoc },
    settings: { jsdoc: { mode: "typescript" } },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          // The fixer would insert an empty comment, which defeats the point.
          enableFixer: false,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
          contexts: DOCUMENTED_EXPORTS,
        },
      ],
      // An empty `/** */` does not count as documentation.
      "jsdoc/require-description": [
        "error",
        {
          contexts: [
            "FunctionDeclaration",
            "ClassDeclaration",
            "ArrowFunctionExpression",
            "FunctionExpression",
            ...DOCUMENTED_EXPORTS,
          ],
        },
      ],
      // A documented parameter must exist, so comments cannot drift from signatures.
      "jsdoc/check-param-names": "error",
      // Unused variables named with a leading underscore are intentional (stubs, type checks).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    // The fmota.com/chronodex build (NEXT_DIST_DIR, spikes/agent-4/HOSTING.md).
    ".next-chronodex/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Throwaway experiments with their own package.json (MASTER.md section 3).
    "spikes/**",
    // Claude Code internals: skills (markdown) and transient git worktrees, whose `.next` and
    // `node_modules` are generated and must never be linted as app source.
    ".claude/**",
    // Static assets served as-is, including the vendored maplibre-gl worker bundle.
    "public/**",
  ]),
]);

export default eslintConfig;
