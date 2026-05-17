import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone design prototypes / reference mockups — not part of
    // the app build (loose .jsx with undefined demo components).
    "Design/**",
  ]),
  {
    // The React-Compiler advisory rules (eslint-plugin-react-hooks
    // recommended-latest) flag widespread pre-existing patterns
    // (setState in a mount effect, etc.). Useful signal, but not worth
    // a broad risky effect refactor or a red merge gate — keep them as
    // warnings so drift stays visible without blocking.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
