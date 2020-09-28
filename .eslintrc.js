module.exports = {
	env: {
		es6: true,
		node: true,
		mocha: true,
		jest: true
	},
	extends: ['standard'],
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly'
	},

	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module'
	},
	plugins: ['@typescript-eslint', 'chai-friendly'],
	rules: {
		indent: ['error', 'tab'],
		'no-tabs': 0,
		'brace-style': ['error', 'stroustrup'],
		'arrow-parens': ['error', 'always'],
		'no-control-regex': 0,
		'no-useless-escape': 0,
		'array-bracket-spacing': ['error', 'never'],
		'object-curly-spacing': ['error', 'always'],
		'lines-between-class-members': ['error', 'always'],
		'padding-line-between-statements': [
			'error',
			{ blankLine: 'always', prev: '*', next: 'multiline-block-like' },
			{ blankLine: 'always', prev: 'multiline-block-like', next: '*' },
			{ blankLine: 'always', prev: 'multiline-expression', next: '*' },
			{ blankLine: 'always', prev: '*', next: 'multiline-expression' },
			{ blankLine: 'always', prev: '*', next: 'return' }
		],
		'space-before-function-paren': [
			'error',
			{
				anonymous: 'always',
				named: 'always',
				asyncArrow: 'always'
			}
		],
		'standard/no-callback-literal': 1,
		'no-unused-expressions': 0,
		'chai-friendly/no-unused-expressions': 2
	}
}
