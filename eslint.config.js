import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
	{ ignores: ['eslint.config.js', 'dist/**/*.js'] },
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		rules: {
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					'fixStyle': 'inline-type-imports',
				},
			],
			'curly': 'error',
		},
	}
);
