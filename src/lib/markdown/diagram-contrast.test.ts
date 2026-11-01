import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The `--pele-*` mapping from prose.css, resolved through global.css's `:root` and `.dark`
// tokens, so a change to either file is checked.
const styles = new URL('../../styles/', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, styles), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const globalCss = read('global.css');
const proseCss = read('prose.css');

const declarations = (body: string) =>
	Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
const block = (css: string, selector: string) => {
	const body = new RegExp(`(?:^|\\n)\\s*${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
	if (body == null) throw new Error(`No ${selector} block`);
	return declarations(body);
};

const light = block(globalCss, ':root');
const themes = { light, dark: { ...light, ...block(globalCss, '\\.dark') } };
const pele = block(proseCss, '\\.prose \\.diagram');

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

/** A `--pele-*` variable's colour in a theme: opaque oklch or hex, through any `var()` chain. */
const color = (tokens: Record<string, string>, name: string): number[] => {
	const value = tokens[name] ?? pele[name];
	if (value == null) throw new Error(`No ${name}`);
	const ref = /^var\((--[\w-]+)\)$/.exec(value);
	if (ref) return color(tokens, ref[1]!);
	const oklch = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
	if (oklch) return oklchToSrgb(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
	if (/^#[\da-f]{6}$/i.test(value)) return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
	throw new Error(`${name} is "${value}": not an opaque oklch or hex colour`);
};

const luminance = (rgb: number[]) => {
	const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: number[], b: number[]) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi! + 0.05) / (lo! + 0.05);
};

// Text needs 4.5:1, strokes and fills 3:1 (WCAG 1.4.3, 1.4.11). Link labels are accent text,
// gantt bars carry bg-coloured labels on accent fills, and chart slices on series fills.
const pairs: [fg: string, bg: string, min: number][] = [
	...['--pele-fg', '--pele-muted'].flatMap((fg) =>
		['--pele-bg', '--pele-surface', '--pele-surface-alt'].map((bg): [string, string, number] => [fg, bg, 4.5]),
	),
	...['--pele-line', '--pele-border'].flatMap((fg) =>
		['--pele-bg', '--pele-surface'].map((bg): [string, string, number] => [fg, bg, 3]),
	),
	['--pele-accent', '--pele-bg', 4.5],
	['--pele-accent', '--pele-surface', 4.5],
	['--pele-bg', '--pele-accent', 4.5],
	...Array.from({ length: 8 }, (_, i): [string, string, number] => ['--pele-bg', `--pele-series-${i + 1}`, 4.5]),
];

describe('diagram colours', () => {
	for (const [theme, tokens] of Object.entries(themes)) {
		it(`${theme}: text, strokes and fills are readable`, () => {
			for (const [fg, bg, min] of pairs) {
				expect(contrast(color(tokens, fg), color(tokens, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
			}
		});
	}
});
