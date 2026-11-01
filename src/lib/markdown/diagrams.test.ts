import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { createDiagrams } from './diagrams.ts';

// `Other note.md` is published; `Secret plan` is a private note.
const index = new Map([['other note', 'other-note']]);

// Shiki on, so a fence that reached it would show its markup.
const processor = await createSatteriMarkdownProcessor({
	mdastPlugins: [createDiagrams({ loadIndex: () => index })],
	syntaxHighlight: 'shiki',
} as Parameters<typeof createSatteriMarkdownProcessor>[0]);
const NOTE = new URL('../../../content/articles/Note.md', import.meta.url);
const render = async (markdown: string) => (await processor.render(markdown, { fileURL: NOTE })).code.trim();
const mermaid = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\``;
const ids = (html: string) => [...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
const attributes = (html: string) => [...html.matchAll(/\s[\w:-]+="([^"]*)"/g)].map((m) => m[1]).join('\n');

describe('mermaid fences', () => {
	it('render as an inline SVG in a named scroll region, not as code', async () => {
		const html = await render(mermaid('flowchart LR\n  A --> B'));
		expect(html).toMatch(/^<div class="diagram" tabindex="0" role="region" aria-label="Diagram"><svg /);
		expect(html).not.toMatch(/astro-code|<pre|<code/);
	});

	it('keep their natural width', async () => {
		const html = await render(mermaid('flowchart LR\n  A --> B'));
		expect(html).toMatch(/<svg [^>]*width="\d+"/);
		expect(html).not.toContain('max-width:100%');
	});

	it('get ids unique within the document', async () => {
		const diagram = mermaid('flowchart LR\n  accTitle: Steps\n  accDescr: How it goes\n  A --> B');
		const html = await render(`${diagram}\n\n${diagram}`);
		const all = ids(html);
		expect(all.length).toBeGreaterThan(0);
		expect(new Set(all).size).toBe(all.length);
		expect(html).toContain('id="diagram-1-');
		expect(html).toContain('id="diagram-2-');
	});

	it('leave other fences as code', async () => {
		const html = await render('```js\nconst a = 1;\n```');
		expect(html).toContain('<pre class="astro-code');
		expect(html).not.toContain('<svg');
	});

	it('fail the build on invalid mermaid, naming the file', async () => {
		await expect(render(mermaid('graph TD\n  A -->'))).rejects.toThrow(/^Invalid diagram in content\/articles\/Note\.md: /);
	});
});

describe('accessible name', () => {
	it('is the diagram type without an accTitle', async () => {
		const html = await render(mermaid('flowchart LR\n  A --> B'));
		expect(html).toMatch(/<svg role="img" aria-label="Flowchart diagram"/);
		expect(html).not.toContain('graphics-document');
	});

	it('is the accTitle when there is one', async () => {
		const html = await render(mermaid('flowchart LR\n  accTitle: Steps\n  A --> B'));
		const labelledBy = /<svg [^>]*aria-labelledby="([^"]+)"/.exec(html)?.[1];
		expect(labelledBy).toMatch(/^diagram-1-/);
		expect(html).toContain(`<title id="${labelledBy}">Steps</title>`);
		expect(html).not.toContain('aria-label="Flowchart diagram"');
	});
});

describe('internal links', () => {
	it('go to a published article', async () => {
		const html = await render(mermaid('flowchart LR\n  A[Other note]\n  class A internal-link'));
		expect(html).toContain('<a class="internal-link" href="/other-note">');
		expect(html).not.toContain('data-href');
	});

	it('go to a heading of a published article', async () => {
		const html = await render(mermaid('flowchart LR\n  A[Other note#Some heading]\n  class A internal-link'));
		expect(html).toContain('<a class="internal-link" href="/other-note#some-heading">');
	});

	it('are plain text to an unpublished note, with the name in no attribute', async () => {
		const html = await render(mermaid('flowchart LR\n  A[Secret plan]\n  class A internal-link'));
		expect(html).not.toContain('<a');
		expect(html).toContain('>Secret plan</text>');
		expect(attributes(html)).not.toContain('Secret plan');
	});

	it('resolve a click to a note name, and keep a click to a URL', async () => {
		const html = await render(
			mermaid('flowchart LR\n  A[One] --> B[Two] --> C[Three]\n  click A "Other note"\n  click B "Secret plan"\n  click C "https://example.com"'),
		);
		expect(html).toContain('<a class="internal-link" href="/other-note">');
		expect(attributes(html)).not.toContain('Secret plan');
		expect(html).toContain('href="https://example.com/"');
	});
});
