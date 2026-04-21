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
  ]),
  // Service-role Supabase client — only allowed in webhook route handlers
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/api/webhooks/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/shared/lib/supabase/service",
                "@/shared/lib/supabase/service",
              ],
              message:
                "The service-role client is only allowed in src/app/api/webhooks/**. Use the user-scoped client instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
