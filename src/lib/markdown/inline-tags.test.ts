import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { inlineTags } from './inline-tags.ts';
import { readingTime } from './reading-time.ts';

const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [inlineTags, readingTime], syntaxHighlight: false });
const render = async (markdown: string) => (await processor.render(markdown)).code.trim();
const span = (tag: string) => `<span class="tag">${tag}</span>`;

describe('inline tags', () => {
	it('wrap a tag in a span, not a link', async () => {
		expect(await render('Written in #rust today.')).toBe(`<p>Written in ${span('#rust')} today.</p>`);
	});

	it('keep nested tags whole', async () => {
		expect(await render('See #obsidian/plugins.')).toBe(`<p>See ${span('#obsidian/plugins')}.</p>`);
	});

	it('take Polish letters', async () => {
		expect(await render('O #zażółć i #gęślą-jaźń')).toBe(`<p>O ${span('#zażółć')} i ${span('#gęślą-jaźń')}</p>`);
	});

	it('work at the start of a paragraph and side by side', async () => {
		expect(await render('#rust #2026plans')).toBe(`<p>${span('#rust')} ${span('#2026plans')}</p>`);
	});

	it('need a non-digit, so `#123` stays text', async () => {
		expect(await render('Issue #123 and #1')).toBe('<p>Issue #123 and #1</p>');
	});

	it('need whitespace before the hash, so `a#b` stays text', async () => {
		expect(await render('C# and a#b')).toBe('<p>C# and a#b</p>');
	});

	it('need whitespace or a line start before the hash, not formatting', async () => {
		expect(await render('**bold**#tag and *em* #ok')).toBe(`<p><strong>bold</strong>#tag and <em>em</em> ${span('#ok')}</p>`);
		expect(await render('*#inside* emphasis')).toBe(`<p><em>${span('#inside')}</em> emphasis</p>`);
		expect(await render('line one  \n#after-break')).toBe(`<p>line one<br>\n${span('#after-break')}</p>`);
		expect(await render('line one\n#soft-break')).toBe(`<p>line one\n${span('#soft-break')}</p>`);
	});

	it('leave an escaped or entity hash as text', async () => {
		expect(await render('\\#literal, &#35;entity, &#x23;hex, &num;named and #real')).toBe(
			`<p>#literal, #entity, #hex, #named and ${span('#real')}</p>`,
		);
		expect(await render('An &#8212; dash, "quotes" and #real')).toBe(`<p>An — dash, “quotes” and ${span('#real')}</p>`);
	});

	it('leave code alone', async () => {
		expect(await render('`#rust` and\n\n```\n#rust\n```')).toBe(
			'<p><code>#rust</code> and</p>\n<pre><code>#rust\n</code></pre>',
		);
	});

	it('leave URL fragments and link text alone', async () => {
		expect(await render('https://x.y/#a and [#rust](https://x.y)')).toBe(
			'<p><a href="https://x.y/#a">https://x.y/#a</a> and <a href="https://x.y">#rust</a></p>',
		);
	});

	it('leave heading markers alone, tagging only the text', async () => {
		expect(await render('## About #rust')).toBe(`<h2 id="about-rust">About ${span('#rust')}</h2>`);
	});

	it('still count for reading time', async () => {
		const words = Array.from({ length: 300 }, (_, i) => `#tag${i}`).join(' ');
		expect((await processor.render(words)).metadata.frontmatter.minutesRead).toBe(2);
	});
});
