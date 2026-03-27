import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, process: "readonly" },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    settings: { react: { version: "18.3" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/jsx-no-target-blank": "off",
      // R3F uses custom Three.js props (position, rotation, castShadow, etc.)
      "react/no-unknown-property": "off",
      // PropTypes not used in this project (React 19, no prop-types package)
      "react/prop-types": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Import ordering: React → third-party → local → styles
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // React first
            ["^react$", "^react/"],
            // Third-party packages
            ["^@?\\w"],
            // Relative imports — components, hooks, utils, store
            ["^\\.\\./|^\\.{1,2}/"],
            // Style files last
            ["\\.style(\\.js)?$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  // Node.js files: vite/playwright config, scripts, store (uses process.env)
  {
    files: [
      "vite.config.js",
      "playwright.config.js",
      "lighthouserc.js",
      "scripts/**/*.js",
      "src/store/store.js",
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // Test files: Node globals (setImmediate, global) + vitest globals (it, expect)
  {
    files: ["**/*.test.{js,jsx}", "e2e/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        it: "readonly",
        expect: "readonly",
        describe: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        test: "readonly",
      },
    },
  },
];
