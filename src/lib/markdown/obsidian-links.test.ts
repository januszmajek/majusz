import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { imageWidth } from './image-width.ts';
import { obsidianGuard } from './obsidian-guard.ts';
import { createObsidianLinks } from './obsidian-links.ts';

// `Other note.md` and `Polish.md` are published; anything else is a private note.
const index = new Map([
	['other note', 'other-note'],
	['polish', 'polski'],
]);

// Files in content/attachments/, keyed by lowercase name as on a case-insensitive lookup.
const attachments = new Map(['photo.png', 'photo with space.jpg'].map((f) => [f.toLowerCase(), f]));

// Astro's own Sätteri pipeline, so heading ids are the ones Astro gives the target page.
const processor = await createSatteriMarkdownProcessor({
	mdastPlugins: [createObsidianLinks({ loadIndex: () => index, loadAttachments: () => attachments }), obsidianGuard],
	hastPlugins: [imageWidth],
	syntaxHighlight: false,
});
const NOTE = new URL('../../../content/articles/Note.md', import.meta.url);
const render = async (markdown: string) => (await processor.render(markdown, { fileURL: NOTE })).code.trim();
// Astro swaps a local image for a placeholder carrying its props as JSON.
const image = async (markdown: string) => {
	const json = /__ASTRO_IMAGE_="([^"]+)"/.exec(await render(markdown))?.[1];
	return json && JSON.parse(json.replaceAll('&quot;', '"'));
};
const headingId = async (heading: string) => /id="([^"]+)"/.exec(await render(`## ${heading}`))?.[1];

// Private note names and paths in the fixtures; none may reach the HTML except as visible text.
const expectPlain = (html: string, text: string) => {
	expect(html).not.toContain('<a');
	expect(html).not.toMatch(/\.md|Secret%20|private\//i);
	expect(html).toBe(`<p>See ${text} here.</p>`);
};

describe('wikilinks to published articles', () => {
	it('link to the article page, with the target as written', async () => {
		expect(await render('See [[Other note]] here.')).toBe('<p>See <a href="/other-note">Other note</a> here.</p>');
	});

	it('resolve case-insensitively, keeping the text as typed', async () => {
		expect(await render('[[other NOTE]]')).toBe('<p><a href="/other-note">other NOTE</a></p>');
	});

	it('accept a `.md` extension and a folder path', async () => {
		expect(await render('[[Other note.md]]')).toBe('<p><a href="/other-note">Other note</a></p>');
		expect(await render('[[articles/Other note]]')).toBe('<p><a href="/other-note">Other note</a></p>');
	});

	it('show the alias', async () => {
		expect(await render('[[Other note|the other one]]')).toBe('<p><a href="/other-note">the other one</a></p>');
	});

	it('link a heading by the id Astro gives it, Polish characters included', async () => {
		const id = await headingId('Zażółć gęślą');
		expect(id).toBeTruthy();
		// The href is percent-encoded; browsers decode a fragment before matching it to an id.
		expect(await render('[[Polish#Zażółć gęślą]]')).toBe(
			`<p><a href="/polski#${encodeURIComponent(id!)}">Polish &gt; Zażółć gęślą</a></p>`,
		);
	});

	it('link a heading in the same article', async () => {
		expect(await render('[[#Some heading]]')).toBe('<p><a href="#some-heading">Some heading</a></p>');
	});

	it('link a block reference to the page', async () => {
		expect(await render('[[Other note#^abc123]]')).toBe('<p><a href="/other-note">Other note</a></p>');
	});

	it('split several links out of one text node', async () => {
		expect(await render('[[Other note]], [[Secret]] and [[Polish|po polsku]].')).toBe(
			'<p><a href="/other-note">Other note</a>, Secret and <a href="/polski">po polsku</a>.</p>',
		);
	});
});

describe('wikilinks to unpublished notes', () => {
	it('render the name as plain text', async () => {
		expectPlain(await render('See [[Secret plans]] here.'), 'Secret plans');
	});

	it('render the alias as plain text', async () => {
		expectPlain(await render('See [[Secret plans|my notes]] here.'), 'my notes');
	});

	it('render a heading link as `Name > Heading`', async () => {
		expectPlain(await render('See [[Secret plans#Budget]] here.'), 'Secret plans &gt; Budget');
	});

	it('never show the folder path', async () => {
		expectPlain(await render('See [[private/Secret plans.md]] here.'), 'Secret plans');
	});
});

describe('relative `.md` links', () => {
	it('go to the article page when published', async () => {
		expect(await render('[the other](Other%20note.md)')).toBe('<p><a href="/other-note">the other</a></p>');
		expect(await render('[h](../articles/Other%20note.md#Some%20heading)')).toBe(
			'<p><a href="/other-note#some-heading">h</a></p>',
		);
	});

	it('render as their text when unpublished', async () => {
		expectPlain(await render('See [my **notes**](private/Secret%20plans.md "Secret") here.'), 'my <strong>notes</strong>');
	});

	it('leave other links alone', async () => {
		expect(await render('[a](https://x.y/a.md)')).toBe('<p><a href="https://x.y/a.md">a</a></p>');
		expect(await render('[a](/docs/a.md)')).toBe('<p><a href="/docs/a.md">a</a></p>');
		expect(await render('[a](photo.png)')).toBe('<p><a href="photo.png">a</a></p>');
	});
});

describe('syntax left for others', () => {
	it('leaves `[[x]]` in inline code alone', async () => {
		expect(await render('`[[Other note]]`')).toBe('<p><code>[[Other note]]</code></p>');
	});

	it('leaves an unclosed `[[x` for the guard', async () => {
		await expect(render('An [[unclosed link')).rejects.toThrow(
			/Raw Obsidian syntax in content\/articles\/Note.md: "An \[\[unclosed link"/,
		);
	});

	it('leaves note embeds for the guard, published or not', async () => {
		await expect(render('![[Other note]]')).rejects.toThrow(/Raw Obsidian syntax in content\/articles\/Note.md: "!\[\[Other note\]\]"/);
		await expect(render('Text ![[Secret plans]] and [[Other note]]')).rejects.toThrow(/Raw Obsidian syntax/);
	});
});

describe('image embeds', () => {
	it('render the image from content/attachments/', async () => {
		expect(await image('![[photo.png]]')).toMatchObject({ src: '../attachments/photo.png', alt: '' });
	});

	it('match the file name case-insensitively and use the name on disk', async () => {
		expect(await image('![[Photo.PNG]]')).toMatchObject({ src: '../attachments/photo.png' });
		expect(await image('![[attachments/photo.png]]')).toMatchObject({ src: '../attachments/photo.png' });
	});

	it('take a width', async () => {
		expect(await image('![[photo.png|300]]')).toMatchObject({ src: '../attachments/photo.png', alt: '', width: 300 });
	});

	it('take alt text, with or without a width', async () => {
		expect(await image('![[photo.png|A cat]]')).toMatchObject({ alt: 'A cat' });
		expect(await image('![[photo.png|A cat|300]]')).toMatchObject({ alt: 'A cat', width: 300 });
	});

	it('keep spaces in the file name through encoding', async () => {
		// The url is percent-encoded like a pasted image's; Astro decodes it to find the file.
		expect(await image('![[photo with space.jpg]]')).toMatchObject({ src: '../attachments/photo with space.jpg' });
	});

	it('sit inline with the text around them', async () => {
		const html = await render('Look: ![[photo.png]] and [[Other note]].');
		expect(html).toMatch(/^<p>Look: <img [^>]+> and <a href="\/other-note">Other note<\/a>.<\/p>$/);
	});

	it('fail the build on a missing file, naming the article', async () => {
		await expect(render('![[missing.png]]')).rejects.toThrow(
			'Image "missing.png" in content/articles/Note.md: no such file in content/attachments/',
		);
	});

	it('reject a width and height, as pasted images do', async () => {
		await expect(render('![[photo.png|300x200]]')).rejects.toThrow(/use a width only, like "\|300"/);
	});
});
