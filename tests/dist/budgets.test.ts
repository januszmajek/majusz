import { readFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DIST, distFiles } from './dist.ts';

// Budgets for what every page carries before its content: the <head>, the CSS and the JS. Set
// after the site-performance change from the largest page of a build with the lab/ mock articles
// (2026-11-24), plus ~15% headroom. The article body is not budgeted; it grows with the article.
// Raise a budget only on purpose, with the new measured value in its comment.
const HEAD_BYTES = 7_000; // measured 6,103 (raw <head>, longest article title and summary, inline math @font-face)
const CSS_BROTLI_BYTES = 11_000; // measured 9,285 (linked stylesheet + inline <style>, brotli)
const JS_BROTLI_BYTES = 3_500; // measured 3,058 (prefetch module 951 + inline motif and toggle modules, brotli each)
const PRELOADS = 3; // measured 3 (Iosevka 400 and 600, Aile 400); fonts.test.ts pins the 8 faces

const pages = distFiles().filter((file) => file.endsWith('.html'));
const read = (path: string) => readFileSync(new URL(path, DIST));
const brotli = (data: Buffer | string) => brotliCompressSync(data).length;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// Local paths (no leading slash) of the tags matching `tag` whose `attr` points at this site.
const localSources = (html: string, tag: RegExp, attr: string): string[] =>
	[...html.matchAll(tag)]
		.map((m) => new RegExp(`\\b${attr}\\s*=\\s*["']?\\/([^"'\\s>]+)`, 'i').exec(m[0])?.[1])
		.filter((path): path is string => path !== undefined);

const head = (html: string) => /<head\b[^>]*>[\s\S]*?<\/head>/i.exec(html)?.[0] ?? '';

const cssBrotli = (html: string) =>
	sum([
		...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => brotli(m[1])),
		...localSources(html, /<link\b[^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*>/gi, 'href').map((path) => brotli(read(path))),
	]);

// External scripts plus the bodies of inline `<script type="module">` (the motif and the theme
// toggle), so inlining a module can't hide it from the budget. Not counted: the speculation
// rules (JSON, not code) and the classic theme script that sets `.dark` before first paint.
const inlineModules = (html: string): string[] =>
	[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
		.filter((m) => /\btype\s*=\s*["']?module\b/i.test(m[1]) && !/\bsrc\s*=/i.test(m[1]))
		.map((m) => m[2]);

const jsBrotli = (html: string) =>
	sum([
		...localSources(html, /<script\b[^>]*>/gi, 'src').map((path) => brotli(read(path))),
		...inlineModules(html).map((body) => brotli(body)),
	]);

const preloads = (html: string) => [...html.matchAll(/<link\b[^>]*>/gi)].filter((m) => /\brel\s*=\s*["']?preload\b/i.test(m[0])).length;

describe('page budgets in dist/', () => {
	it('finds built pages to check', () => {
		expect(pages).toContain('index.html');
		expect(pages).toContain('about.html');
	});

	describe.each(pages)('%s', (page) => {
		const html = read(page).toString('utf8');

		it(`keeps <head> within ${HEAD_BYTES} bytes`, () => {
			const bytes = Buffer.byteLength(head(html));
			expect(bytes, `dist/${page}: <head> is ${bytes} bytes, budget ${HEAD_BYTES}`).toBeLessThanOrEqual(HEAD_BYTES);
		});

		it(`keeps CSS within ${CSS_BROTLI_BYTES} bytes brotli`, () => {
			const bytes = cssBrotli(html);
			expect(bytes, `dist/${page}: CSS is ${bytes} bytes brotli, budget ${CSS_BROTLI_BYTES}`).toBeLessThanOrEqual(CSS_BROTLI_BYTES);
		});

		it(`keeps JS within ${JS_BROTLI_BYTES} bytes brotli`, () => {
			const bytes = jsBrotli(html);
			expect(bytes, `dist/${page}: JS is ${bytes} bytes brotli, budget ${JS_BROTLI_BYTES}`).toBeLessThanOrEqual(JS_BROTLI_BYTES);
		});

		it(`has at most ${PRELOADS} preloads`, () => {
			const count = preloads(html);
			expect(count, `dist/${page}: ${count} <link rel=preload>, budget ${PRELOADS}`).toBeLessThanOrEqual(PRELOADS);
		});
	});
});
