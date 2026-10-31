import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { flightDeckDark, flightDeckLight } from './flight-deck.ts';

// --card per site theme, read from global.css so a palette change is checked too.
const css = readFileSync(new URL('../../../styles/global.css', import.meta.url), 'utf8');
const card = (block: string) => {
	const match = new RegExp(`${block}\\s*\\{[^}]*?--card:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`).exec(css);
	if (!match) throw new Error(`No --card in ${block} of global.css`);
	return oklchToSrgb(Number(match[1]), Number(match[2]), Number(match[3]));
};

/** oklch → sRGB channels in 0–1 (Björn Ottosson's matrices), clamped to the gamut. */
function oklchToSrgb(L: number, C: number, h: number) {
	const a = C * Math.cos((h * Math.PI) / 180);
	const b = C * Math.sin((h * Math.PI) / 180);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const linear = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	return linear.map((c) => Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
}

const fromHex = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (rgb: number[]) => {
	const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: number[], b: number[]) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi! + 0.05) / (lo! + 0.05);
};

const foregrounds = (theme: typeof flightDeckLight) => [
	theme.colors?.['editor.foreground'],
	...(theme.tokenColors ?? []).map((rule) => rule.settings.foreground),
].filter((color): color is string => typeof color === 'string');

describe('code themes', () => {
	for (const [theme, block] of [
		[flightDeckLight, ':root'],
		[flightDeckDark, '\\.dark'],
	] as const) {
		it(`${theme.name}: every token color reaches 4.5:1 on --card`, () => {
			const background = card(block);
			for (const color of foregrounds(theme)) {
				expect(contrast(fromHex(color), background), `${color} on ${block} --card`).toBeGreaterThanOrEqual(4.5);
			}
		});
	}

	it('emit only CSS variables, and render an unknown language as plain text', async () => {
		const processor = await createSatteriMarkdownProcessor({
			syntaxHighlight: 'shiki',
			shikiConfig: { themes: { light: flightDeckLight, dark: flightDeckDark }, defaultColor: false },
		} as Parameters<typeof createSatteriMarkdownProcessor>[0]);
		const ts = (await processor.render('```ts\nconst a = 1;\n```')).code;
		expect(ts).toContain('--shiki-light:#C63A00');
		expect(ts).toContain('--shiki-dark:#5CC27A');
		expect(ts).not.toMatch(/style="[^"]*(?<!-)\bcolor:/);
		expect(ts).not.toMatch(/background-color:/);
		const unknown = (await processor.render('```nosuchlang\nplain <text>\n```')).code;
		expect(unknown).toContain('data-language="plaintext"');
		expect(unknown).toContain('<span>plain &lt;text&gt;</span>');
	});
});
