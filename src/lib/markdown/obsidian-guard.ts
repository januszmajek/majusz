// Fails the build on Obsidian syntax the site can't render yet, so readers never see it raw
// (AGENTS.md hard rule). A slice removes its pattern here when it adds rendering for it.
// Checked: `text` nodes, image alt text and link titles (both reach the HTML as attributes).
// `code` and `inlineCode` are their own node types, so an article can show the syntax in
// backticks or a code block.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

const inlinePatterns = [
	// Note embeds (`![[Other note]]`): out of v1 (PRD FR-009). obsidian-links renders image
	// embeds and leaves note embeds as text for this pattern.
	/!\[\[/,
	// Wikilinks obsidian-links didn't consume: malformed ones (`[[unclosed`, `[[a[b]]`) and any
	// in alt text or a link title, which it doesn't read.
	/\[\[/,
	// Comments (`%%hidden%%`): S-03 hides them, as Obsidian does.
	/%%/,
	// Highlight (`==mark==`): S-03. Non-space inside both ends, as in Obsidian, so `a == b` passes.
	// Misses a highlight split by inline formatting (`==**bold**==`); S-03 must cover it.
	/==[^\s=](?:[^=]*[^\s=])?==/,
];
// Callouts (`> [!note]` as a blockquote's first text): S-03.
const callout = /^\[![^\]\s]+\]/;

const SNIPPET_CONTEXT = 20;
// Repo root, to name the file as `content/articles/<note>.md`.
const ROOT = new URL('../../../', import.meta.url).href;

const inlineMatch = (text: string) => inlinePatterns.map((pattern) => pattern.exec(text)).find((m) => m != null);

const fail = (text: string, match: RegExpExecArray, fileURL: URL | undefined): never => {
	const file = fileURL ? decodeURI(fileURL.href.replace(ROOT, '')) : 'a markdown file';
	const start = Math.max(0, match.index - SNIPPET_CONTEXT);
	const snippet = text.slice(start, match.index + match[0].length + SNIPPET_CONTEXT).replace(/\s+/g, ' ').trim();
	throw new Error(`Raw Obsidian syntax in ${file}: "${snippet}"`);
};

export const obsidianGuard = {
	name: 'obsidian-guard',
	text(node, ctx) {
		const text = node.value;
		let match = inlineMatch(text);
		if (!match) {
			const paragraph = ctx.parent(node);
			const opensBlockquote =
				ctx.indexOf(node) === 0 && ctx.indexOf(paragraph) === 0 && ctx.parent(paragraph)?.type === 'blockquote';
			if (opensBlockquote) match = callout.exec(text) ?? undefined;
		}
		if (match) fail(text, match, ctx.fileURL);
	},
	image(node, ctx) {
		for (const text of [node.alt, node.title]) {
			const match = text ? inlineMatch(text) : undefined;
			if (text && match) fail(text, match, ctx.fileURL);
		}
	},
	link(node, ctx) {
		const match = node.title ? inlineMatch(node.title) : undefined;
		if (node.title && match) fail(node.title, match, ctx.fileURL);
	},
} satisfies MdastPlugin;
