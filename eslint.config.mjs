import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["node_modules/", "dist/", ".yarn/", "dev/config/"],
  },
  tseslint.configs.recommended,
  prettierRecommended,
  {
    plugins: {
      "import-x": importX,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-console": "off",
      "prettier/prettier": "warn",
      "import-x/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
        },
      ],
    },
  },
);
