import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { callouts } from './callouts.ts';
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
	mdastPlugins: [comments, callouts, highlight, obsidianLinks, inlineTags, obsidianGuard],
	syntaxHighlight: false,
});
const render = async (markdown: string) => (await processor.render(markdown)).code.trim();
const icon = '<span class="callout-icon" aria-hidden="true"></span>';
const title = (text: string, tag = 'div') =>
	`<${tag} class="callout-title">${icon}<span class="callout-title-inner">${text}</span></${tag}>`;

describe('callouts', () => {
	it('render a callout with its type as the default title', async () => {
		expect(await render('> [!note]\n> Body text.')).toBe(
			`<div class="callout" data-callout="note">${title('Note')}<div class="callout-content"><p>Body text.</p></div></div>`,
		);
		expect(await render('> [!FAQ]\n> x')).toContain(`data-callout="faq">${title('FAQ')}`);
		expect(await render('> [!faq]\n> x')).toContain(title('Faq'));
	});

	it('take a custom title with formatting and links', async () => {
		expect(await render("> [!warning] Don't *run* [[Published]]\n> Body.")).toBe(
			`<div class="callout" data-callout="warning">${title('Don’t <em>run</em> <a href="/published">Published</a>')}<div class="callout-content"><p>Body.</p></div></div>`,
		);
		expect(await render('> [!tip] ==Hot== tip\n> Body.')).toContain(title('<mark>Hot</mark> tip'));
	});

	it('fold with `-` closed and `+` open', async () => {
		expect(await render('> [!tip]- Closed\n> Hidden.')).toBe(
			`<details class="callout" data-callout="tip">${title('Closed', 'summary')}<div class="callout-content"><p>Hidden.</p></div></details>`,
		);
		expect(await render('> [!tip]+ Open\n> Shown.')).toBe(
			`<details class="callout" data-callout="tip" open>${title('Open', 'summary')}<div class="callout-content"><p>Shown.</p></div></details>`,
		);
	});

	it('render a title-only callout with no content', async () => {
		expect(await render('> [!info] Just a title')).toBe(`<div class="callout" data-callout="info">${title('Just a title')}</div>`);
		expect(await render('> [!info]')).toBe(`<div class="callout" data-callout="info">${title('Info')}</div>`);
	});

	it('keep a multi-block body', async () => {
		const html = await render('> [!example] Steps\n> First line.\n>\n> - one\n> - two\n>\n> ```\n> code\n> ```');
		expect(html.replace(/>\n</g, '><')).toBe(
			`<div class="callout" data-callout="example">${title('Steps')}<div class="callout-content"><p>First line.</p><ul><li>one</li><li>two</li></ul><pre><code>code\n</code></pre></div></div>`,
		);
	});

	it('end the title at a hard break', async () => {
		expect(await render('> [!note] Title  \n> Body.')).toContain(`${title('Title')}<div class="callout-content"><p>Body.</p></div>`);
	});

	it('nest', async () => {
		expect(await render('> [!question] Outer\n> > [!success] Inner\n> > Done.')).toBe(
			`<div class="callout" data-callout="question">${title('Outer')}<div class="callout-content"><div class="callout" data-callout="success">${title('Inner')}<div class="callout-content"><p>Done.</p></div></div></div></div>`,
		);
	});

	it('render an unknown type like any other', async () => {
		expect(await render('> [!recipe] Pancakes\n> Flour.')).toContain(`data-callout="recipe">${title('Pancakes')}`);
	});

	it('leave a plain blockquote and a mid-line marker alone', async () => {
		expect(await render('> Just a quote.')).toBe('<blockquote>\n<p>Just a quote.</p>\n</blockquote>');
		expect(await render('> See [!note] here.')).toBe('<blockquote>\n<p>See [!note] here.</p>\n</blockquote>');
	});

	it('hide a comment inside a callout', async () => {
		expect(await render('> [!note] Title %%x%%\n> Body %%y%%.')).toContain(`${title('Title ')}<div class="callout-content"><p>Body .</p></div>`);
	});
});
