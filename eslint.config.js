import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config(
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "dev-dist/**/*",
      "public/**/*"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/root-path": import.meta.dirname,
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.app.json"
        },
      },
      "boundaries/elements": [
        {
          type: "app",
          pattern: "src/app/**",
        },
        {
          type: "features",
          pattern: "src/features/*/**",
          capture: ["featureName"],
        },
        {
          type: "shared",
          pattern: ["src/shared/**", "src/config/**"],
        },
        {
          type: "sw",
          pattern: "src/sw/**",
        },
      ],
    },
    rules: {
      "boundaries/no-unknown-dependencies": "error",
      "@typescript-eslint/no-explicit-any": "off", // Allow any for dynamic payloads/skeletons
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: { element: { type: ["app", "features", "shared"] } },
            },
            {
              from: { element: { type: "features" } },
              allow: { element: { type: "shared" } },
            },
            {
              from: { element: { type: "features" } },
              allow: { element: { type: "features", captured: { featureName: "{{from.captured.featureName}}" } } },
            },
            {
              from: { element: { type: "shared" } },
              allow: { element: { type: "shared" } },
            },
            {
              from: { element: { type: "sw" } },
              allow: { element: { type: ["sw", "shared"] } },
            },
          ],
        },
      ],
    },
  }
);
