import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import subsetFont from 'subset-font';
import temml from 'temml';
import { collectMathGlyphs, hasTable, subsetMathFont } from './math-font.ts';

describe('collectMathGlyphs', () => {
	const html = `<p>outside q</p>${temml.renderToString('x + \\mathbb{R} + h + \\alpha')}<p>also outside z</p>`;
	const glyphs = collectMathGlyphs(html);

	it('collects the characters inside <math>, with the italic forms of single letters', () => {
		for (const char of ['+', 'ℝ', 'x', '\u{1d465}', 'h', '\u210e', 'α', '\u{1d6fc}']) expect(glyphs).toContain(char);
	});

	it('ignores text outside <math>', () => {
		expect(glyphs).not.toMatch(/[oqz]/);
	});

	it('adds no italic form for an upright letter', () => {
		expect(collectMathGlyphs('<math><mi mathvariant="normal">x</mi></math>')).toBe('x');
	});

	it('adds no italic form for a multi-letter identifier', () => {
		expect(collectMathGlyphs('<math><mi>sin</mi></math>')).toBe('ins');
	});

	it('decodes entities', () => {
		expect(collectMathGlyphs('<math><mo>&lt;</mo><mo>&#x2211;</mo><mo>&amp;</mo></math>')).toBe('&<∑');
	});

	it('returns nothing for a page without math', () => {
		expect(collectMathGlyphs('<p>$5 and $6</p>')).toBe('');
	});
});

describe('subsetMathFont', () => {
	it('cuts the font to a small woff2 that keeps its MATH table', async () => {
		const sample = temml.renderToString('\\int_0^\\infty \\sum_{i=1}^n \\left( \\frac{\\alpha}{\\sqrt{x}} \\right)', {
			displayMode: true,
		});
		const font = await subsetMathFont(collectMathGlyphs(sample));
		expect(font.toString('latin1', 0, 4)).toBe('wOF2');
		expect(font.length).toBeLessThan(30 * 1024);
		expect(hasTable(await subsetFont(font, collectMathGlyphs(sample), { targetFormat: 'sfnt' }), 'MATH')).toBe(true);
	});

	it('tells a font without a MATH table apart', async () => {
		const iosevka = await readFile(new URL('../assets/fonts/iosevka-400-normal.woff2', import.meta.url));
		expect(hasTable(await subsetFont(iosevka, 'a', { targetFormat: 'sfnt' }), 'MATH')).toBe(false);
	});
});
