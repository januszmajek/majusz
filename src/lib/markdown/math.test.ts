import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { callouts } from './callouts.ts';
import { comments } from './comments.ts';
import { highlight } from './highlight.ts';
import { inlineTags } from './inline-tags.ts';
import { math } from './math.ts';
import { obsidianGuard } from './obsidian-guard.ts';
import { readingTime } from './reading-time.ts';

const processor = await createSatteriMarkdownProcessor({
	features: { math: true },
	mdastPlugins: [math, callouts, readingTime],
	syntaxHighlight: false,
});
const render = async (markdown: string) => (await processor.render(markdown)).code.trim();
const full = await createSatteriMarkdownProcessor({
	features: { math: true },
	mdastPlugins: [comments, math, callouts, highlight, inlineTags, readingTime, obsidianGuard],
	syntaxHighlight: false,
});
const renderFull = async (markdown: string) => (await full.render(markdown)).code.trim();
const fileURL = new URL('../../../content/articles/note.md', import.meta.url);
const displayWrapper = '<div class="math-display" tabindex="0" role="region" aria-label="Formula"><math';

describe('math', () => {
	it('render inline `$x$` as MathML in the text', async () => {
		const html = await render('a $x$ b');
		expect(html).toMatch(/^<p>a <math[^>]*>.*<\/math> b<\/p>$/s);
		expect(html).not.toContain('display="block"');
		expect(html).not.toContain('math-display');
	});

	it('leave a `$` with whitespace inside it as text, as Obsidian does', async () => {
		expect(await render('$5 and $6 money')).toBe('<p>$5 and $6 money</p>');
		expect(await render('$ x $')).toBe('<p>$ x $</p>');
	});

	it('leave mid-paragraph `$$x$$` as text', async () => {
		expect(await render('Para $$x$$ mid')).toBe('<p>Para $$x$$ mid</p>');
	});

	it('render a paragraph that is only `$$x$$` as display math', async () => {
		expect(await render('$$x$$')).toMatch(new RegExp(`^${displayWrapper}[^>]*display="block"`));
		expect(await render('- $$x$$')).toMatch(new RegExp(`<li>\\s*${displayWrapper}`));
	});

	it('render a `$$` block as display math, also in a blockquote and a callout', async () => {
		expect(await render('$$\n\\int x\\,dx\n$$')).toMatch(new RegExp(`^${displayWrapper}.*∫.*</math></div>$`, 's'));
		expect(await render('> $$\n> y\n> $$')).toMatch(new RegExp(`^<blockquote>\\s*${displayWrapper}`));
		expect(await render('> [!note]\n> $$\n> y\n> $$')).toContain(`<div class="callout-content">${displayWrapper}`);
	});

	it('render a `$$x$$` line right under a callout title as display math', async () => {
		for (const markdown of ['> [!note]\n> $$x$$', '> [!tip]- Euler $e$\n> $$x$$']) {
			const html = await render(markdown);
			expect(html).toContain(`<div class="callout-content">${displayWrapper}`);
			expect(html).not.toContain('$$');
		}
		expect(await render('> [!tip] Euler $e$\n> $$x$$')).toMatch(/callout-title-inner">Euler <math/);
		// Not a callout, or not the line right under the title: text, as in Obsidian.
		expect(await render('> [!note]\n> text\n> $$x$$')).toContain('$$x$$');
		expect(await render('[!note]\n$$x$$')).toBe('<p>[!note]\n$$x$$</p>');
	});

	it('fail the build on an unclosed `$$`, naming the file', async () => {
		await expect(processor.render('$$\nunclosed\n\nmore para', { fileURL })).rejects.toThrow(
			'Raw Obsidian syntax in content/articles/note.md: "$$ unclosed more para"',
		);
		await expect(processor.render('$$x\ny$$')).rejects.toThrow('Raw Obsidian syntax');
		await expect(processor.render('$$ dropped\nx\n$$')).rejects.toThrow('put $$ on its own line');
	});

	it('fail the build on invalid TeX', async () => {
		await expect(processor.render('a $\\frac{1}$ b', { fileURL })).rejects.toThrow(
			'Invalid math in content/articles/note.md: "\\frac{1}"',
		);
	});

	it('render `align` in display math', async () => {
		expect(await render('$$\n\\begin{align}a&=b\\\\c&=d\\end{align}\n$$')).toContain(displayWrapper);
	});

	it('render `\\ce`, `\\dv` and `\\abs`', async () => {
		for (const tex of ['\\ce{H2O}', '\\dv{f}{x}', '\\abs{x}']) {
			expect(await render(`$${tex}$`)).toMatch(/^<p><math/);
		}
	});

	it('fail the build on a `$` Obsidian would pair after a rejected one', async () => {
		await expect(processor.render('$5 and $6 money$', { fileURL })).rejects.toThrow('write \\$ for a dollar sign');
	});

	it("don't pair a `$` in a link destination or inline HTML", async () => {
		expect(await render('See [ℝ link](https://e.com/?a=$1) and $ 5 then x$')).toBe(
			'<p>See <a href="https://e.com/?a=$1">ℝ link</a> and $ 5 then x$</p>',
		);
		expect(await render('![a](https://e.com/$1.png) and $ 5 then x$')).toContain('and $ 5 then x$');
		expect(await render('<abbr title="$">USD</abbr> cost $ 5 and x$')).toBe('<p><abbr title="$">USD</abbr> cost $ 5 and x$</p>');
	});

	it('fail the build on markdown between two rejected `$`', async () => {
		for (const markdown of [
			'Pay $ 5 for **pro** and $ 6',
			'Pay $ 5 for [basic](https://a.com) and $ 6',
			'Pay $ 5 with `code` and $ 6',
			'Pay $ 5 &amp; tax $',
			'Pay $ 5 for a \\* and $ 6',
		]) {
			await expect(processor.render(markdown, { fileURL })).rejects.toThrow("can't render markdown between two $");
		}
		expect(await render('Pay \\$ 5 for **pro** and \\$ 6')).toBe('<p>Pay $ 5 for <strong>pro</strong> and $ 6</p>');
	});

	it('show `\\$` as a dollar sign', async () => {
		expect(await render('\\$5 and \\$6 money\\$')).toBe('<p>$5 and $6 money$</p>');
	});

	it('leave `$` in code as written', async () => {
		expect(await render('`$x$`')).toBe('<p><code>$x$</code></p>');
		expect(await render('$ a $ and `$b$`')).toBe('<p>$ a $ and <code>$b$</code></p>');
	});

	it('leave formula words out of the reading time', async () => {
		const words = Array.from({ length: 1000 }, () => '\\text{word}').join(' ');
		const { metadata } = await processor.render(`short\n\n$$\n${words}\n$$`, { frontmatter: {} });
		expect(metadata.frontmatter.minutesRead).toBe(1);
	});
});

describe('math among the other plugins', () => {
	it('render math in a callout title and body', async () => {
		const html = await renderFull('> [!tip] Euler $e^{i\\pi}$\n> Body $x$ and #tag');
		expect(html).toMatch(/<span class="callout-title-inner">Euler <math.*<\/math><\/span>/s);
		expect(html).toMatch(/<p>Body <math.*<\/math> and <span class="tag">#tag<\/span><\/p>/s);
	});

	it('fail the build, naming the cause, on a `%%` inside a `$…$` span', async () => {
		for (const markdown of ['Price %%old: $5%% now $x$ ok', 'I paid $5 %% was $6? %% today']) {
			await expect(full.render(markdown, { fileURL })).rejects.toThrow(
				/^%% comment inside \$…\$ in content\/articles\/note\.md: .*write \\\$ for a dollar sign/,
			);
		}
		expect(await renderFull('I paid \\$5 %% was \\$6? %% today')).toBe('<p>I paid $5  today</p>');
	});

	it("don't render or fail on math inside a comment", async () => {
		expect(await renderFull('a %%$\\frac{1}$ and $$x%% b')).toBe('<p>a  b</p>');
	});
});
