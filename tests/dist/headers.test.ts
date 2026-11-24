import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIST } from './dist.ts';

// The cache rules Workers reads from dist/_headers (copied from public/_headers). Rules for the
// same path merge, so the hashed paths must detach the HTML rule's Cache-Control (`!`) before
// setting their own, or they would carry both values.
const HEADERS = new URL('_headers', DIST);

type Rule = { path: string; lines: string[] };

// `_headers` format: a path at column 0, then its indented header lines; `#` starts a comment.
const parse = (text: string): Rule[] => {
	const rules: Rule[] = [];
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (line === '' || line.startsWith('#')) continue;
		if (/^\s/.test(raw)) {
			const rule = rules.at(-1);
			if (!rule) throw new Error(`header line before any path: ${raw}`);
			rule.lines.push(line.replace(/\s*:\s*/, ': '));
		} else {
			rules.push({ path: line, lines: [] });
		}
	}
	return rules;
};

const YEAR = 'Cache-Control: public, max-age=31536000, immutable';

describe('dist/_headers', () => {
	it('exists', () => {
		expect(existsSync(HEADERS), 'dist/_headers is missing (public/_headers)').toBe(true);
	});

	it('caches HTML for 60 s and hashed assets and fonts for a year, once', () => {
		expect(parse(readFileSync(HEADERS, 'utf8'))).toEqual([
			{ path: '/*', lines: ['Cache-Control: public, max-age=60'] },
			{ path: '/_astro/*', lines: ['! Cache-Control', YEAR] },
			{ path: '/fonts/*', lines: ['! Cache-Control', YEAR] },
		]);
	});
});
