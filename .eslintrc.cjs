module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: "module"
  },
  env: {
    browser: true,
    es2023: true,
    node: true
  },
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended"
  ],
  plugins: ["@typescript-eslint", "jsx-a11y", "import"],
  settings: {
    "import/resolver": {
      typescript: {}
    }
  },
  rules: {
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ],
    "import/order": [
      "error",
      {
        groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"], "object", "type"],
        alphabetize: { order: "asc", caseInsensitive: true },
        "newlines-between": "always"
      }
    ],
    "import/no-default-export": "error",
    "prettier/prettier": "error"
  },
  ignorePatterns: ["node_modules", "dist", ".next", "*.config.js", "*.config.cjs", "playwright-report", "coverage"]
};
