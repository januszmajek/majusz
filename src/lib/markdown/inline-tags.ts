// Obsidian's inline tags (`#rust`, `#obsidian/plugins`) as `<span class="tag">#rust</span>`, so
// the body shows a tag instead of a stray hash. Not a link: the site has no tag pages. The text
// is unchanged, so reading time counts it as before.
// A tag is `#` at the start of a line or after whitespace, then letters, digits, `_`, `/` or
// `-`, with at least one non-digit (so `#123`, `a#b` and `**b**#c` aren't tags), as in Obsidian.
// An escaped `\#word` or `&#35;word` isn't a tag either, so an article can show a literal hash
// word. Heading markers and code aren't text nodes, so they're never touched; nor is text
// directly inside a link.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

const tag = /(?<=^|\s)#(?=[\p{L}\p{N}_/-]*[\p{L}_/-])[\p{L}\p{N}_/-]+/gu;
const escape = /^\\[!-/:-@[-`{-~]/;
const entity = /^&(?:#(\d+)|#x([\da-f]+)|([a-z][a-z\d]*));/i;

/**
 * For each `#` the parser produced from `source`, in order: `true` when written as a literal `#`,
 * `false` when written as `\#`, `&#35;`, `&#x23;` or `&num;`. Other escapes and entities never
 * produce a `#`, and smart punctuation doesn't either, so the order matches the node's value.
 */
const literalHashes = (source: string) => {
	const hashes: boolean[] = [];
	for (let i = 0; i < source.length; i++) {
		const rest = source.slice(i);
		const escaped = escape.exec(rest);
		if (escaped) {
			if (rest[1] === '#') hashes.push(false);
			i += escaped[0].length - 1;
			continue;
		}
		const ref = entity.exec(rest);
		if (ref) {
			const [whole, decimal, hex, name] = ref;
			const code = decimal ? Number(decimal) : hex ? parseInt(hex, 16) : name === 'num' ? 35 : -1;
			if (code === 35) hashes.push(false);
			i += whole.length - 1;
			continue;
		}
		if (source[i] === '#') hashes.push(true);
	}
	return hashes;
};

export const inlineTags = {
	name: 'inline-tags',
	options: { position: true },
	text(node, ctx) {
		const parent = ctx.parent(node);
		if (parent?.type === 'link' || parent?.type === 'linkReference') return;
		const text = node.value;
		// A text node starts mid-line after `**b**` or a link; only a line break or a line start
		// counts as the start of a line there.
		const index = ctx.indexOf(node) ?? 0;
		const previous = index > 0 ? parent?.children[index - 1] : undefined;
		const startsLine = !previous || previous.type === 'break';
		// Nodes another plugin made have no position; their hashes count as literal.
		const { start, end } = node.position ?? {};
		const hashes = start && end ? literalHashes(ctx.source.slice(start.offset, end.offset)) : [];
		const hashCount = text.split('#').length - 1;
		const literal = (hash: number) => hashes.length !== hashCount || hashes[hash];

		const pieces: MdastContent[] = [];
		let last = 0;
		for (const match of text.matchAll(tag)) {
			if (match.index === 0 && !startsLine) continue;
			if (!literal(text.slice(0, match.index).split('#').length - 1)) continue;
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
