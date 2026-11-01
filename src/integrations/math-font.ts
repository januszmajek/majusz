// Latin Modern Math for the MathML that src/lib/markdown/math.ts writes, cut at build time to the
// glyphs the built pages use, so no publish step is added. prose.css declares the font at
// `/fonts/latin-modern-math.woff2`, a path that isn't in public/:
// - in dev, a middleware serves the vendored full font there;
// - after the build, the font is subset to the characters inside every `<math>` in dist/,
//   written there, and the CSS URL gets a content-hash `?v=`. No `<math>` on any page: no font,
//   and the URL is never fetched.
// Fails the build if the subset lost its MATH table (stretchy brackets, big operators and
// sub/superscript layout live there) or if no built CSS holds the font URL.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import subsetFont from 'subset-font';

const URL_PATH = '/fonts/latin-modern-math.woff2';
const SOURCE = new URL('../assets/fonts/math/latinmodern-math.woff2', import.meta.url);

const entities: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0' };
const decode = (text: string) =>
	text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
		if (name[0] !== '#') return entities[name.toLowerCase()] ?? entity;
		return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
	});

// The Mathematical Italic code point the browser draws a single-letter `<mi>` from (MathML Core).
const greekItalic: Record<string, number> = {
	'ϴ': 0x1d6f3, '∇': 0x1d6fb, '∂': 0x1d715, 'ϵ': 0x1d716, 'ϑ': 0x1d717, 'ϰ': 0x1d718, 'ϕ': 0x1d719,
	'ϱ': 0x1d71a, 'ϖ': 0x1d71b, 'ı': 0x1d6a4, 'ȷ': 0x1d6a5,
};
const italic = (char: string): string | undefined => {
	const code = char.codePointAt(0)!;
	if (char === 'h') return '\u210e';
	if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(0x1d44e + code - 0x61);
	if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(0x1d434 + code - 0x41);
	if (code >= 0x3b1 && code <= 0x3c9) return String.fromCodePoint(0x1d6fc + code - 0x3b1);
	if (code >= 0x391 && code <= 0x3a9 && code !== 0x3a2) return String.fromCodePoint(0x1d6e2 + code - 0x391);
	return greekItalic[char] === undefined ? undefined : String.fromCodePoint(greekItalic[char]);
};

/** The unique characters inside `<math>…</math>` in `html`, plus the italic forms of `<mi>` letters. */
export const collectMathGlyphs = (html: string): string => {
	const glyphs = new Set<string>();
	for (const [body] of html.matchAll(/<math[\s>][\s\S]*?<\/math>/g)) {
		for (const [, attributes = '', content] of body.matchAll(/<mi(\s[^>]*)?>([^<]*)<\/mi>/g)) {
			const letter = decode(content);
			if ([...letter].length !== 1 || /mathvariant="normal"/.test(attributes)) continue;
			const form = italic(letter);
			if (form) glyphs.add(form);
		}
		for (const char of decode(body.replace(/<[^>]*>/g, ''))) glyphs.add(char);
	}
	return [...glyphs].sort().join('');
};

/** Whether an OpenType font (sfnt) has a table with this tag. */
export const hasTable = (font: Buffer, tag: string) => {
	const count = font.readUInt16BE(4);
	for (let i = 0; i < count; i++) if (font.toString('latin1', 12 + i * 16, 16 + i * 16) === tag) return true;
	return false;
};

/** The vendored font cut to `glyphs`, as woff2; throws if the subset lost its MATH table. */
export const subsetMathFont = async (glyphs: string): Promise<Buffer> => {
	const source = await readFile(SOURCE);
	if (!hasTable(await subsetFont(source, glyphs, { targetFormat: 'sfnt' }), 'MATH')) {
		throw new Error(`The Latin Modern Math subset has no MATH table (${SOURCE.pathname})`);
	}
	return subsetFont(source, glyphs, { targetFormat: 'woff2' });
};

const files = async (dir: string, extension: string) =>
	(await readdir(dir, { recursive: true })).filter((name) => name.endsWith(extension)).map((name) => join(dir, name));

export const mathFont = (): AstroIntegration => ({
	name: 'math-font',
	hooks: {
		'astro:server:setup': ({ server }) => {
			server.middlewares.use(async (req, res, next) => {
				if (req.url?.split('?')[0] !== URL_PATH) return next();
				res.setHeader('Content-Type', 'font/woff2');
				res.end(await readFile(SOURCE));
			});
		},
		'astro:build:done': async ({ dir, logger }) => {
			const dist = fileURLToPath(dir);
			const html = await files(dist, '.html');
			let glyphs = '';
			for (const page of html) glyphs += collectMathGlyphs(await readFile(page, 'utf8'));
			glyphs = [...new Set(glyphs)].join('');
			if (!glyphs) return;

			const font = await subsetMathFont(glyphs);
			const out = join(dist, URL_PATH);
			await mkdir(dirname(out), { recursive: true });
			await writeFile(out, font);

			const versioned = `${URL_PATH}?v=${createHash('sha256').update(font).digest('hex').slice(0, 8)}`;
			let rewritten = 0;
			for (const css of await files(join(dist, '_astro'), '.css')) {
				const text = await readFile(css, 'utf8');
				if (!text.includes(URL_PATH)) continue;
				await writeFile(css, text.replaceAll(URL_PATH, versioned));
				rewritten++;
			}
			if (!rewritten) throw new Error(`No built CSS in dist/_astro/ references ${URL_PATH}, so the math font can't be versioned`);
			logger.info(`${URL_PATH}: ${[...glyphs].length} glyphs, ${(font.length / 1024).toFixed(1)} KB, ${versioned}`);
		},
	},
});
