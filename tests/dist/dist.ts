import { readdirSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The built site, as a directory URL (trailing slash). */
export const DIST = new URL('../../dist/', import.meta.url);

/** Every file in dist/, as a path relative to it with `/` separators. */
export const distFiles = (): string[] => {
	const root = fileURLToPath(DIST);
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => relative(root, `${entry.parentPath}/${entry.name}`).split('\\').join('/'));
};
