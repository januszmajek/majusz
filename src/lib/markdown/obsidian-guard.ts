// Fails the build on Obsidian syntax the site can't render yet, so readers never see it raw
// (AGENTS.md hard rule). A slice removes its pattern here when it adds rendering for it.
// Checked: `text` nodes, image alt text and link titles (both reach the HTML as attributes), and
// the whole text of each paragraph, heading and table cell for a highlight split across
// formatting levels. `code` and `inlineCode` are their own node types, so an article can show the
// syntax in backticks or a code block.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

// Highlight (`==mark==`) the highlight plugin couldn't render: in alt text or a link title, or
// split across formatting levels (`**==a** b==`). Non-space inside both ends, as in Obsidian, so
// `a == b` passes.
const highlight = /==[^\s=](?:[^=]*[^\s=])?==/;

const inlinePatterns = [
	// Note embeds (`![[Other note]]`): out of v1 (PRD FR-009). obsidian-links renders image
	// embeds and leaves note embeds as text for this pattern.
	/!\[\[/,
	// Wikilinks obsidian-links didn't consume: malformed ones (`[[unclosed`, `[[a[b]]`) and any
	// in alt text or a link title, which it doesn't read.
	/\[\[/,
	// Comments (`%%hidden%%`): the comments plugin hides them and fails on an unclosed one, so
	// this catches only alt text and link titles.
	/%%/,
	highlight,
];

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

type Node = { readonly type: string; readonly value?: unknown; readonly children?: readonly Node[] };

// Text nodes only: unlike `ctx.textContent`, code stays out, so `==a==` in backticks passes.
const proseText = (node: Node): string =>
	node.type === 'text' ? (node.value as string) : (node.children ?? []).map(proseText).join('');

const splitHighlight = (node: Node, fileURL: URL | undefined) => {
	const text = proseText(node);
	const match = highlight.exec(text);
	if (match) fail(text, match, fileURL);
};

export const obsidianGuard = {
	name: 'obsidian-guard',
	text(node, ctx) {
		const text = node.value;
		const match = inlineMatch(text);
		if (match) fail(text, match, ctx.fileURL);
	},
	// A rendered highlight leaves no `==` behind, so one in a block's whole text crossed levels.
	paragraph(node, ctx) {
		splitHighlight(node, ctx.fileURL);
	},
	heading(node, ctx) {
		splitHighlight(node, ctx.fileURL);
	},
	tableCell(node, ctx) {
		splitHighlight(node, ctx.fileURL);
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
