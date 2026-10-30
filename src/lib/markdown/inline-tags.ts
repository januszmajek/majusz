// Obsidian's inline tags (`#rust`, `#obsidian/plugins`) as `<span class="tag">#rust</span>`, so
// the body shows a tag instead of a stray hash. Not a link: the site has no tag pages. The text
// is unchanged, so reading time counts it as before.
// A tag is `#` at the start of a text node or after whitespace, then letters, digits, `_`, `/`
// or `-`, with at least one non-digit (so `#123` and `a#b` aren't tags), as in Obsidian. Heading
// markers and code aren't text nodes, so they're never touched; nor is link text.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

const tag = /(?<=^|\s)#(?=[\p{L}\p{N}_/-]*[\p{L}_/-])[\p{L}\p{N}_/-]+/gu;

export const inlineTags = {
	name: 'inline-tags',
	text(node, ctx) {
		const parent = ctx.parent(node)?.type;
		if (parent === 'link' || parent === 'linkReference') return;
		const text = node.value;
		const pieces: MdastContent[] = [];
		let last = 0;
		for (const match of text.matchAll(tag)) {
			if (match.index > last) pieces.push({ type: 'text', value: text.slice(last, match.index) });
			pieces.push({
				type: 'tag',
				data: { hName: 'span', hProperties: { className: ['tag'] } },
				children: [{ type: 'text', value: match[0] }],
			});
			last = match.index + match[0].length;
		}
		if (last === 0) return;
		if (last < text.length) pieces.push({ type: 'text', value: text.slice(last) });
		ctx.replaceNode(node, pieces);
	},
} satisfies MdastPlugin;
