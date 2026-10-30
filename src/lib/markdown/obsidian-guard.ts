// Fails the build on Obsidian syntax the site can't render yet, so readers never see it raw
// (AGENTS.md hard rule). A slice removes its pattern here when it adds rendering for it.
// Only `text` nodes are checked: `code` and `inlineCode` are their own node types, so an
// article can show the syntax in backticks or a code block.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

const inlinePatterns = [
	// Embeds (`![[x.png]]`): S-02 renders image embeds; note embeds stay out of v1 (PRD FR-009).
	/!\[\[/,
	// Wikilinks obsidian-links didn't consume (`[[unclosed`, `[[a[b]]`): the safety net, as
	// obsidian-links runs first and renders every well-formed one.
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

export const obsidianGuard = {
	name: 'obsidian-guard',
	text(node, ctx) {
		const text = node.value;
		let match = inlinePatterns.map((pattern) => pattern.exec(text)).find((m) => m != null);
		if (!match) {
			const paragraph = ctx.parent(node);
			const opensBlockquote =
				ctx.indexOf(node) === 0 && ctx.indexOf(paragraph) === 0 && ctx.parent(paragraph)?.type === 'blockquote';
			if (opensBlockquote) match = callout.exec(text) ?? undefined;
		}
		if (!match) return;

		const file = ctx.fileURL ? decodeURI(ctx.fileURL.href.replace(ROOT, '')) : 'a markdown file';
		const start = Math.max(0, match.index - SNIPPET_CONTEXT);
		const snippet = text.slice(start, match.index + match[0].length + SNIPPET_CONTEXT).replace(/\s+/g, ' ').trim();
		throw new Error(`Raw Obsidian syntax in ${file}: "${snippet}"`);
	},
} satisfies MdastPlugin;
