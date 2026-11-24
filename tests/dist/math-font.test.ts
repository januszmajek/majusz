import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIST, distFiles } from './dist.ts';

// The Latin Modern Math `@font-face` lives inline in every page (Layout.astro), and
// src/integrations/math-font.ts versions its URL in the HTML only. Hashed /_astro/*.css is cached
// as immutable for a year, so a URL rewritten inside it after Vite named the file would keep
// returning readers on an old glyph subset.
const URL_PATH = '/fonts/latin-modern-math.woff2';
const FONT = new URL(URL_PATH.slice(1), DIST);

const files = distFiles();
const pages = files.filter((file) => file.endsWith('.html'));
const stylesheets = files.filter((file) => file.startsWith('_astro/') && file.endsWith('.css'));
const read = (path: string) => readFileSync(new URL(path, DIST), 'utf8');

const mathFaces = (html: string): string[] =>
	[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].flatMap((m) =>
		[...m[1].matchAll(/@font-face\s*\{([^}]*)\}/gi)].map((face) => face[1]).filter((body) => /Latin Modern Math/i.test(body)),
	);

describe('math font in dist/', () => {
	it('finds built pages and stylesheets to check', () => {
		expect(pages).toContain('index.html');
		expect(stylesheets.length).toBeGreaterThan(0);
	});

	it.each(stylesheets)('%s does not reference the math font', (css) => {
		const text = read(css);
		expect(text, `dist/${css}`).not.toContain('latin-modern-math');
		expect(text, `dist/${css}`).not.toContain('?v=');
	});

	// With a formula on some page the build writes the subset and versions every page's URL;
	// with none it writes no font and leaves the URL as written (never fetched).
	it.each(pages)('%s declares the math @font-face inline exactly once', (page) => {
		const faces = mathFaces(read(page));
		expect(faces, `inline Latin Modern Math @font-face in dist/${page}`).toHaveLength(1);
		const url = /url\(\s*["']?([^"')]+)/i.exec(faces[0])?.[1];
		expect(url, `math font URL in dist/${page}`).toMatch(existsSync(FONT) ? /^\/fonts\/latin-modern-math\.woff2\?v=[\da-f]{8}$/ : /^\/fonts\/latin-modern-math\.woff2$/);
	});
});
