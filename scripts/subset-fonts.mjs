// Cuts Iosevka and Iosevka Aile down to the characters the site uses and writes
// them to src/assets/fonts/, which astro.config.mjs loads with the local font
// provider. Fontsource ships Iosevka only as the whole font (~1 MB per face).
// Run by hand when a font, weight or character range changes:
//   node scripts/subset-fonts.mjs
// Not a publish step: articles never need it.
import { mkdir, writeFile } from 'node:fs/promises';
import subsetFont from 'subset-font';

const FAMILIES = { iosevka: 'iosevka', 'iosevka-aile': 'iosevka-aile' };
const WEIGHTS = [400, 500, 600, 700];
const STYLES = ['normal', 'italic'];
const SOURCE = (id, weight, style) =>
	`https://cdn.jsdelivr.net/fontsource/fonts/${id}@5.3.0/latin-${weight}-${style}.woff2`;

// Latin, Latin-1, Latin Extended-A (Polish), the punctuation prose uses, € and
// ™, a few arrows and math signs, box drawing (section rules) and the ✦ bullet.
const RANGES = [
	[0x20, 0x7e],
	[0xa0, 0xff],
	[0x100, 0x17f],
	[0x2010, 0x2027],
	[0x2030, 0x203a],
	[0x20ac, 0x20ac],
	[0x2122, 0x2122],
	[0x2190, 0x2199],
	[0x2212, 0x2212],
	[0x2248, 0x2248],
	[0x2260, 0x2265],
	[0x2500, 0x257f],
	[0x2726, 0x2726],
];
const text = RANGES.flatMap(([from, to]) =>
	Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i)),
).join('');

const out = new URL('../src/assets/fonts/', import.meta.url);
await mkdir(out, { recursive: true });

for (const [id, file] of Object.entries(FAMILIES)) {
	for (const weight of WEIGHTS) {
		for (const style of STYLES) {
			const res = await fetch(SOURCE(id, weight, style));
			if (!res.ok) throw new Error(`${res.status} ${res.url}`);
			const source = Buffer.from(await res.arrayBuffer());
			const subset = await subsetFont(source, text, {
				targetFormat: 'woff2',
				// Keep only glyphs for these characters, not every stylistic variant
				// Iosevka's layout tables can reach (most of the file's size).
				noLayoutClosure: true,
			});
			const name = `${file}-${weight}-${style}.woff2`;
			await writeFile(new URL(name, out), subset);
			console.log(`${name}  ${(source.length / 1024).toFixed(0)} KB → ${(subset.length / 1024).toFixed(0)} KB`);
		}
	}
}
