import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { createObsidianLinks } from './obsidian-links.ts';
import { tableScroll } from './table-scroll.ts';

const obsidianLinks = createObsidianLinks({
	loadIndex: () => new Map([['published', 'published']]),
	loadAttachments: () => new Map(),
});
const processor = await createSatteriMarkdownProcessor({
	mdastPlugins: [obsidianLinks],
	hastPlugins: [tableScroll],
	syntaxHighlight: false,
});
const render = async (markdown: string) => (await processor.render(markdown)).code.trim();

describe('table scroll', () => {
	it('wrap a table in a focusable, named scroll region', async () => {
		const html = await render('| a | b |\n|:--|--:|\n| 1 | 2 |');
		expect(html).toMatch(/^<div class="table-scroll" tabindex="0" role="region" aria-label="Table"><table>/);
		expect(html).toMatch(/<\/table><\/div>$/);
	});

	it('keep column alignment', async () => {
		const html = await render('| a | b |\n|:--|--:|\n| 1 | 2 |');
		expect(html).toContain('<th style="text-align: left">a</th>');
		expect(html).toContain('<td style="text-align: right">2</td>');
	});

	it('resolve a wikilink alias escaped for the table', async () => {
		expect(await render('| a |\n|---|\n| [[Published\\|the post]] |')).toContain('<td><a href="/published">the post</a></td>');
	});

	it('leave other markup alone', async () => {
		expect(await render('Just text.')).toBe('<p>Just text.</p>');
	});
});
