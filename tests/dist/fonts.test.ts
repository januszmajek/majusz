import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIST, distFiles } from './dist.ts';

// The font set (context/foundation/design.md): Iosevka and Iosevka Aile at 400 and 600, normal
// and italic, so at most 8 faces; the first screen's three faces preloaded. Astro also emits
// metric-matched fallback faces (`local()` sources); only faces served from /_astro/fonts/ count.
const pages = distFiles().filter((file) => file.endsWith('.html'));
const read = (path: string) => readFileSync(new URL(path, DIST), 'utf8');

// A page's CSS: its inline <style> blocks plus the local stylesheets it links.
const css = (html: string): string => {
	const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
	const linked = [...html.matchAll(/<link\b[^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*>/gi)]
		.map((m) => /\bhref\s*=\s*["']?\/([^"'\s>]+)/i.exec(m[0])?.[1])
		.filter((href): href is string => href !== undefined)
		.map(read);
	return [...inline, ...linked].join('\n');
};

const servedFaces = (text: string): string[] =>
	[...text.matchAll(/@font-face\s*\{([^}]*)\}/gi)].map((m) => m[1]).filter((body) => /url\(\s*["']?\/_astro\/fonts\//i.test(body));

const weight = (face: string): string | undefined => /font-weight\s*:\s*([^;]+)/i.exec(face)?.[1].trim();

const fontPreloads = (html: string): string[] =>
	[...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => /\brel\s*=\s*["']?preload\b/i.test(tag) && /\bas\s*=\s*["']?font\b/i.test(tag));

describe('fonts in dist/', () => {
	it('finds built pages to check', () => {
		expect(pages).toContain('index.html');
		expect(pages).toContain('about.html');
	});

	it.each(pages)('%s declares at most 8 served faces, none at 500 or 700', (page) => {
		const faces = servedFaces(css(read(page)));
		expect(faces.length, `@font-face rules with a /_astro/fonts/ source in dist/${page}`).toBeGreaterThan(0);
		expect(faces.length, `@font-face rules with a /_astro/fonts/ source in dist/${page}`).toBeLessThanOrEqual(8);
		const weights = faces.map(weight);
		expect(weights, `font-weight of served faces in dist/${page}`).not.toContain('500');
		expect(weights, `font-weight of served faces in dist/${page}`).not.toContain('700');
	});

	it.each(pages)('%s preloads exactly 3 fonts', (page) => {
		expect(fontPreloads(read(page)), `<link rel=preload as=font> in dist/${page}`).toHaveLength(3);
	});
});
