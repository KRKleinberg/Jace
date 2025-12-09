import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ['**/*.{ts,mts,cts}'],
		languageOptions: {
			globals: globals.node,
			parserOptions: { projectService: true, tsconfigRootDir: __dirname },
		},
	},
]);
