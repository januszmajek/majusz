import { defineConfig } from 'vitest/config';

// `npm test` runs before the build in CI, so it only takes the unit tests next to the code; the
// checks of the built site in tests/dist/ run after it through vitest.dist.config.ts.
export default defineConfig({
	test: { include: ['src/**/*.test.ts'] },
});
