import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIST, distFiles } from './dist.ts';

// Instant navigation: Chromium prerenders the next page from the inline speculation rules, other
// browsers get the visible links prefetched by Astro's module. No page hydrates React, so that
// module is the only external script anywhere, and every page must load it.
const pages = distFiles().filter((file) => file.endsWith('.html'));
const read = (page: string) => readFileSync(new URL(page, DIST), 'utf8');

type Rule = { eagerness?: string };
const speculationRules = (html: string): string[] =>
	[...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']?speculationrules["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

// In Astro's prefetch module (astro/dist/prefetch): it reads `el.dataset.astroPrefetch`.
const PREFETCH_MARKER = 'astroPrefetch';

const scriptSources = (html: string): string[] =>
	[...html.matchAll(/<script\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3]);

describe('navigation setup in dist/', () => {
	it('finds built pages to check', () => {
		expect(pages).toContain('index.html');
		expect(pages).toContain('about.html');
	});

	it.each(pages)('%s has one speculation rules script with a moderate prerender rule', (page) => {
		const rules = speculationRules(read(page));
		expect(rules, `script[type=speculationrules] in dist/${page}`).toHaveLength(1);
		const parsed = JSON.parse(rules[0]) as { prerender?: Rule[] };
		expect(parsed.prerender?.some((rule) => rule.eagerness === 'moderate'), `moderate prerender rule in dist/${page}`).toBe(true);
	});

	// Every hydrated component renders as an `<astro-island>`. The page text isn't searched for
	// `client:load` and the like: an article showing that directive in code would fail the deploy.
	it.each(pages)('%s hydrates nothing', (page) => {
		expect(read(page), `dist/${page}`).not.toMatch(/<astro-island\b/i);
	});

	it.each(pages)('%s loads exactly one external script, Astro’s prefetch module', (page) => {
		const sources = scriptSources(read(page));
		expect(sources, `external scripts in dist/${page}`).toHaveLength(1);
		expect(sources[0], `external script in dist/${page}`).toMatch(/^\/_astro\/[^/]+\.js$/);
		// The module reads each link's `data-astro-prefetch`; a property name survives minifying.
		const module = readFileSync(new URL(sources[0].slice(1), DIST), 'utf8');
		expect(module, `${sources[0]} in dist/${page} is not Astro’s prefetch module`).toContain(PREFETCH_MARKER);
	});
});
