import { existsSync } from 'node:fs';
import { DIST } from './dist.ts';

// Without this, a missing build would surface as a confusing ENOENT inside each test, or as a
// link check that passes because it found no pages.
export default function setup() {
	if (!existsSync(new URL('index.html', DIST))) {
		throw new Error(`No build found at ${DIST.pathname} (dist/index.html is missing). Run \`npm run build\` before \`npm run check:dist\`.`);
	}
}
