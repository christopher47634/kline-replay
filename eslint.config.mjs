import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 调试输出不进生产；error/warn 用于真实异常（frameLoop、API 路由）
      "no-console": ["error", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // 命令行工具和脚本本来就靠 console 输出
    files: ["scripts/**", "e2e/**"],
    rules: { "no-console": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".logs/**",
      ".playwright-cli/**",
      "output/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".venv/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
