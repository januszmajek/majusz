import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { comments } from './comments.ts';
import { highlight } from './highlight.ts';
import { inlineTags } from './inline-tags.ts';
import { obsidianGuard } from './obsidian-guard.ts';
import { createObsidianLinks } from './obsidian-links.ts';

const obsidianLinks = createObsidianLinks({
	loadIndex: () => new Map([['published', 'published']]),
	loadAttachments: () => new Map(),
});
const processor = await createSatteriMarkdownProcessor({
	mdastPlugins: [comments, highlight, obsidianLinks, inlineTags, obsidianGuard],
	syntaxHighlight: false,
});
const render = async (markdown: string) => (await processor.render(markdown)).code.trim();

describe('highlight', () => {
	it('mark a highlight', async () => {
		expect(await render('a ==marked== b')).toBe('<p>a <mark>marked</mark> b</p>');
		expect(await render('==one== and ==two==')).toBe('<p><mark>one</mark> and <mark>two</mark></p>');
		expect(await render('x==y==z')).toBe('<p>x<mark>y</mark>z</p>');
	});

	it('mark around formatting, code and links', async () => {
		expect(await render('==**bold**==')).toBe('<p><mark><strong>bold</strong></mark></p>');
		expect(await render('==a *b* c== d')).toBe('<p><mark>a <em>b</em> c</mark> d</p>');
		expect(await render('==see `x`==')).toBe('<p><mark>see <code>x</code></mark></p>');
		expect(await render('==[l](u)==')).toBe('<p><mark><a href="u">l</a></mark></p>');
		expect(await render('==go to [[Published]]==')).toBe('<p><mark>go to <a href="/published">Published</a></mark></p>');
		expect(await render('==#tag==')).toBe('<p><mark><span class="tag">#tag</span></mark></p>');
	});

	it('mark inside formatting, headings and table cells', async () => {
		expect(await render('**a ==b== c**')).toBe('<p><strong>a <mark>b</mark> c</strong></p>');
		expect(await render('==a **==b==** c==')).toBe('<p><mark>a <strong><mark>b</mark></strong> c</mark></p>');
		expect(await render('## A ==b==')).toBe('<h2 id="a-b">A <mark>b</mark></h2>');
		expect(await render('| a |\n|---|\n| ==b== |')).toContain('<td><mark>b</mark></td>');
	});

	it('leave a lone or spaced `==` as text', async () => {
		expect(await render('a == b and c ==')).toBe('<p>a == b and c ==</p>');
		expect(await render('==a == b== c')).toBe('<p><mark>a == b</mark> c</p>');
		expect(await render('a === b === c ==== d')).toBe('<p>a === b === c ==== d</p>');
		expect(await render('== a ==')).toBe('<p>== a ==</p>');
	});

	it('leave `==` in code as written', async () => {
		expect(await render('`==a==` and\n\n```\n==b==\n```')).toBe('<p><code>==a==</code> and</p>\n<pre><code>==b==\n</code></pre>');
	});

	it('ignore a highlight inside a comment', async () => {
		expect(await render('a %%==b==%% c')).toBe('<p>a  c</p>');
	});
});

describe('guard', () => {
	it('fail on a highlight split across formatting levels', async () => {
		await expect(render('**==a** b==')).rejects.toThrow('Raw Obsidian syntax');
		await expect(render('## x *==a* b==')).rejects.toThrow('Raw Obsidian syntax');
	});

	it('fail on a highlight in alt text or a link title', async () => {
		await expect(render('![a ==b==](x.png)')).rejects.toThrow('Raw Obsidian syntax');
		await expect(render('[l](u "==t==")')).rejects.toThrow('Raw Obsidian syntax');
	});

	it('pass rendered highlights', async () => {
		expect(await render('==**a**== and *b* ==c==')).toBe('<p><mark><strong>a</strong></mark> and <em>b</em> <mark>c</mark></p>');
	});
});
