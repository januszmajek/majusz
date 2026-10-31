import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { comments } from './comments.ts';
import { createObsidianLinks } from './obsidian-links.ts';
import { readingTime } from './reading-time.ts';

const obsidianLinks = createObsidianLinks({
	loadIndex: () => new Map([['published', 'published']]),
	loadAttachments: () => new Map(),
});
const processor = await createSatteriMarkdownProcessor({
	mdastPlugins: [comments, obsidianLinks, readingTime],
	syntaxHighlight: false,
});
const render = async (markdown: string) => (await processor.render(markdown)).code.trim();
const fileURL = new URL('../../../content/articles/note.md', import.meta.url);

describe('comments', () => {
	it('hide an inline comment', async () => {
		expect(await render('a %%hidden%% c')).toBe('<p>a  c</p>');
		expect(await render('%%start%% of a line')).toBe('<p> of a line</p>');
		expect(await render('two %%a%% and %%b%% here')).toBe('<p>two  and  here</p>');
	});

	it('hide a comment around or across formatting and links', async () => {
		expect(await render('a %%**bold** [l](u)%% b')).toBe('<p>a  b</p>');
		expect(await render('a **b %%c** d%% e')).toBe('<p>a <strong>b </strong> e</p>');
		expect(await render('**a** %%x%% **b**')).toBe('<p><strong>a</strong>  <strong>b</strong></p>');
	});

	it('hide a block comment, leaving no empty paragraph', async () => {
		expect(await render('before\n\n%%\nblock\n%%\n\nafter')).toBe('<p>before</p>\n<p>after</p>');
		expect(await render('before\n\n%%whole paragraph%%\n\nafter')).toBe('<p>before</p>\n<p>after</p>');
	});

	it('hide a comment across paragraphs and blocks', async () => {
		expect(await render('keep %%from here\n\n# heading\n\n- item\n\n```\ncode\n```\n\nto here%% kept')).toBe(
			'<p>keep </p>\n<p> kept</p>',
		);
	});

	it('hide comments in a list item, table cell and blockquote', async () => {
		expect(await render('- one\n- %%two%%\n- three %%x%%')).toBe('<ul>\n<li>one</li>\n<li>three </li>\n</ul>');
		expect(await render('| a | b |\n|---|---|\n| %%x%% | y %%z%% |')).toBe(
			'<table>\n<thead>\n<tr>\n<th>a</th>\n<th>b</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td></td>\n<td>y </td>\n</tr>\n</tbody>\n</table>',
		);
		expect(await render('> quote %%x%%\n>\n> %%y%%')).toBe('<blockquote>\n<p>quote </p>\n</blockquote>');
	});

	it('leave `%%` in code as written', async () => {
		expect(await render('`%%a%%` and\n\n```\n%%b%%\n```')).toBe('<p><code>%%a%%</code> and</p>\n<pre><code>%%b%%\n</code></pre>');
		expect(await render('%%`%%`%%')).toBe('');
	});

	it("don't resolve wikilinks or embeds inside a comment", async () => {
		expect(await render('a %%[[Private]] ![[missing.png]] ![[Note]]%% b')).toBe('<p>a  b</p>');
		expect(await render('a %%x%% [[Published]]')).toBe('<p>a  <a href="/published">Published</a></p>');
	});

	it('leave comment words out of the reading time', async () => {
		const words = Array.from({ length: 1000 }, () => 'word').join(' ');
		const { metadata } = await processor.render(`short\n\n%%${words}%%`, { frontmatter: {} });
		expect(metadata.frontmatter.minutesRead).toBe(1);
	});

	it('fail the build on an unclosed comment, naming the file', async () => {
		await expect(processor.render('fine %%a%% then %%oops', { fileURL })).rejects.toThrow(
			'Unclosed %% comment in content/articles/note.md: "fine %%a%% then %%oops"',
		);
		await expect(processor.render('one %% only')).rejects.toThrow('Unclosed %% comment');
	});
});
