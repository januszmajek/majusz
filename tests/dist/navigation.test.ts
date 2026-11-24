import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIST, distFiles } from './dist.ts';

// Instant navigation: Chromium prerenders the next page from the inline speculation rules, other
// browsers get the visible links prefetched by Astro's module. No page hydrates React, so that
// module is the only external script anywhere.
const pages = distFiles().filter((file) => file.endsWith('.html'));
const read = (page: string) => readFileSync(new URL(page, DIST), 'utf8');

type Rule = { eagerness?: string };
const speculationRules = (html: string): string[] =>
	[...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']?speculationrules["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

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

	it.each(pages)('%s hydrates nothing', (page) => {
		const html = read(page);
		expect(html, `dist/${page}`).not.toMatch(/<astro-island\b/i);
		expect(html, `dist/${page}`).not.toMatch(/\bclient(?::|=["']?)(?:load|idle|visible|media|only)\b|astro:(?:load|idle|visible|media|only)/i);
	});

	it.each(pages)('%s loads at most one external script, Astro’s prefetch module', (page) => {
		const sources = scriptSources(read(page));
		expect(sources.length, `external scripts in dist/${page}: ${sources.join(', ')}`).toBeLessThanOrEqual(1);
		for (const src of sources) expect(src, `external script in dist/${page}`).toMatch(/^\/_astro\//);
	});
});
