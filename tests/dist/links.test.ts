import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIST, distFiles } from './dist.ts';

// Every internal link must hit a built file at its exact URL: Workers answers `/about/` and
// `/about.html` with a redirect to `/about`, and a path with no file with the 404 page. Only
// `<a href>` is a link; `<link>`/`<script>` sources point at hashed assets, not pages.
const ORIGIN = 'https://majusz.com';

const files = distFiles();
const fileSet = new Set(files);
const pages = files.filter((file) => file.endsWith('.html'));

// The URL Workers serves a built page at: `index.html` → `/`, `about.html` → `/about`.
const pageUrl = (file: string) => `${ORIGIN}/${file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;

const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
const decode = (text: string) =>
	text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
		if (name[0] !== '#') return entities[name.toLowerCase()] ?? entity;
		return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
	});

// The `href` of every `<a>` start tag, quoted or not. Astro's output is regular enough that a
// regex is enough; no HTML parser is a dependency.
const hrefs = (html: string): string[] =>
	[...html.matchAll(/<a\s[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map((m) =>
		decode(m[1] ?? m[2] ?? m[3]),
	);

/** Why an internal link is wrong, or undefined when it is fine or not internal. */
const problem = (href: string, page: string): string | undefined => {
	if (href.startsWith('#')) return undefined;
	const url = new URL(href, pageUrl(page));
	if (url.origin !== ORIGIN) return undefined; // external, mailto:, tel: …
	const path = decodeURIComponent(url.pathname);
	if (path === '/') return fileSet.has('index.html') ? undefined : 'no index.html';
	if (path.endsWith('/')) return 'ends in `/` (Workers redirects it)';
	if (path.endsWith('.html')) return 'ends in `.html` (Workers redirects it)';
	const file = path.slice(1);
	// A page (`/x` → `x.html`), or a non-HTML file linked as is (an image, the favicon).
	if (fileSet.has(`${file}.html`) || (/\.[^/]+$/.test(file) && fileSet.has(file))) return undefined;
	return `no dist/${file}.html`;
};

describe('internal links in dist/', () => {
	it('finds built pages to check', () => {
		expect(pages).toContain('index.html');
		expect(pages).toContain('about.html');
		expect(pages).toContain('404.html');
	});

	it.each(pages)('%s links only to built pages, without a redirect', (page) => {
		const html = readFileSync(new URL(page, DIST), 'utf8');
		const broken = hrefs(html)
			.map((href) => ({ href, why: problem(href, page) }))
			.filter((link) => link.why !== undefined)
			.map((link) => `${link.href}: ${link.why}`);
		expect(broken, `broken internal links in dist/${page}`).toEqual([]);
	});
});
