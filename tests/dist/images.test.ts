import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../astro.config.mjs';
import { DIST, distFiles } from './dist.ts';

// Article images: srcset variants only at the configured breakpoints (capped at 1400 for the
// ~664 px column) or at the image's own width and its 2x, and at most one image per page
// fetched with high priority (image-priority). content/articles/ may hold no article, or none
// with an image; then there is nothing to check and the tests are skipped.
const BREAKPOINTS = new Set(config.image?.breakpoints ?? []);

const pages = distFiles()
	.filter((file) => file.endsWith('.html'))
	.map((file) => ({ file, html: readFileSync(new URL(file, DIST), 'utf8') }));

// Every `<img>` start tag. Astro's output is regular enough that a regex is enough; no HTML
// parser is a dependency.
const imgTags = (html: string): string[] => html.match(/<img\s[^>]*>/gi) ?? [];
const attribute = (tag: string, name: string): string | undefined =>
	new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];

const images = pages.flatMap(({ file, html }) => imgTags(html).map((tag) => ({ file, tag })));

describe.skipIf(images.length === 0)('article images', () => {
	it('configure the breakpoints the check reads', () => {
		expect(BREAKPOINTS.size).toBeGreaterThan(0);
	});

	it('offer only breakpoint widths or the image’s own width and its 2x', () => {
		const stray = images.flatMap(({ file, tag }) => {
			const width = Number(attribute(tag, 'width'));
			const allowed = (w: number) => BREAKPOINTS.has(w) || w === width || w === width * 2;
			const candidates = (attribute(tag, 'srcset') ?? '').split(',').flatMap((candidate) => {
				const match = /\s(\d+)w$/.exec(candidate.trim());
				return match ? [Number(match[1])] : [];
			});
			return candidates.filter((w) => !allowed(w)).map((w) => `${file}: ${w}w in ${tag}`);
		});
		expect(stray).toEqual([]);
	});

	it('fetch at most one image per page with high priority', () => {
		const crowded = pages
			.map(({ file, html }) => ({ file, count: imgTags(html).filter((tag) => /\sfetchpriority="high"/i.test(tag)).length }))
			.filter(({ count }) => count > 1);
		expect(crowded).toEqual([]);
	});
});
