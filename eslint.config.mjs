import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"
import checkFile from "eslint-plugin-check-file"
import eslintConfigPrettier from "eslint-config-prettier"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const namingConvention = [
  "error",

  {
    selector: "default",
    format: ["camelCase"],
    leadingUnderscore: "allow",
    trailingUnderscore: "forbid",
  },

  {
    selector: "variable",
    format: ["camelCase", "UPPER_CASE", "PascalCase"],
    leadingUnderscore: "allow",
  },

  { selector: "function", format: ["camelCase", "PascalCase"] },

  { selector: "variable", modifiers: ["destructured"], format: null },

  {
    selector: ["function", "variable"],
    format: ["UPPER_CASE"],
    filter: {
      regex: "^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$",
      match: true,
    },
  },

  { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },

  { selector: "import", format: ["camelCase", "PascalCase"] },

  { selector: "typeLike", format: ["PascalCase"] },

  {
    selector: "interface",
    format: ["PascalCase"],
    custom: { regex: "^I[A-Z]", match: false },
  },

  { selector: "enumMember", format: ["UPPER_CASE", "PascalCase"] },

  { selector: ["objectLiteralProperty", "typeProperty"], format: null },

  {
    selector: [
      "objectLiteralProperty",
      "typeProperty",
      "objectLiteralMethod",
      "typeMethod",
    ],
    modifiers: ["requiresQuotes"],
    format: null,
  },
]

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scans_monitor.js", // standalone Node CLI script (CommonJS) TODO - (Refactor) change his location and his Require instructions
    ],
  },

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/naming-convention": namingConvention,
    },
  },

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      curly: ["error", "multi-line"],
      "no-nested-ternary": "warn",
      "object-shorthand": "error",
      "prefer-template": "warn",

      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    files: ["app/components/**/*.{jsx,tsx}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.{jsx,tsx}": "PASCAL_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },

  {
    files: ["app/**/*.{js,jsx,ts,tsx}"],
    ignores: ["app/components/**/*.{jsx,tsx}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.{js,jsx,ts,tsx}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },

  {
    files: ["app/**/*.{js,jsx,ts,tsx}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/folder-naming-convention": [
        "error",
        { "app/**/!(\\[*\\]|\\(*\\)|@*|_*)": "KEBAB_CASE" },
      ],
    },
  },

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "import/order": [
        "warn",
        {
          groups: [
            "builtin", // node:fs, path...
            "external", // react, next, dayjs...
            "internal", // alias @/...
            ["parent", "sibling", "index"],
            "type",
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "next/**", group: "external", position: "before" },
            { pattern: "@/**", group: "internal" },
          ],
          pathGroupsExcludedImportTypes: ["react", "type"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "warn",
      "import/newline-after-import": "warn",
    },
  },
  eslintConfigPrettier,
]

export default eslintConfig
