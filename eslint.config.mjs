// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ["coverage/*", "node_modules/*", "build/*", "eslint.config.mjs", ".prettierrc.js"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        }
    }
);