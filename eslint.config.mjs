import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next already registers the jsx-a11y plugin itself (with only
// a handful of its rules enabled, at "warn"), so re-declaring the plugin
// here would conflict with flat config's one-registration-per-name rule —
// only the `rules` object is layered on top. The full recommended set
// catches far more than Next's subset (missing form labels, keyboard
// handlers on click-only elements, invalid roles, etc). Downgraded to "warn"
// here rather than "error" so it flags issues without failing the build on
// the backlog that already exists.
const a11yRulesAsWarnings = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, severity]) => [
    rule,
    severity === "error" ? "warn" : severity,
  ])
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: a11yRulesAsWarnings,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
