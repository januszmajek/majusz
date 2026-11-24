import { defineConfig } from 'vitest/config';

// `npm run check:dist`: checks of the built site in dist/, run after `npm run build` (also in CI).
// The global setup stops the run with one clear message when there is no build to check.
export default defineConfig({
	test: {
		include: ['tests/dist/**/*.test.ts'],
		globalSetup: ['tests/dist/setup.ts'],
	},
});
