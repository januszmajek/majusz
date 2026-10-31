// Obsidian callouts: a blockquote whose first line opens with `[!type]`, then an optional fold
// marker (`+` open, `-` closed) and title. Rendered in Obsidian's shape, so the styles key off the
// same class names:
//   <div class="callout" data-callout="warning">
//     <div class="callout-title"><span class="callout-icon"></span><span class="callout-title-inner">…</span></div>
//     <div class="callout-content">…</div>
//   </div>
// A foldable callout is `<details>` with a `<summary>` title, open for `+`, so it folds without JS.
// The title is the rest of the first line, formatting kept; without one, the type as written,
// capitalized (`[!faq]` → "Faq"), as in Obsidian. Any type renders: an unknown one looks like a
// note (src/styles/prose.css). Callouts nest. A callout with only a title has no content.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;
type Node = { readonly type: string; readonly value?: unknown; readonly children?: readonly Node[] };
type Plain = { type: string; value?: unknown; children?: Plain[]; [key: string]: unknown };

// Same pattern obsidian-guard used to fail on before callouts rendered.
const marker = /^\[!([^\]\s]+)\]([+-]?)/;

const element = (type: string, hName: string, className: string, children: Plain[], properties = {}): Plain => ({
	type,
	data: { hName, hProperties: { className: [className], ...properties } },
	children,
});

/** The `[!type]` marker opening a blockquote, if it's a callout. */
const calloutMarker = (blockquote: Node) => {
	const first = blockquote.children?.[0];
	const text = first?.type === 'paragraph' ? first.children?.[0] : undefined;
	return text?.type === 'text' ? marker.exec(text.value as string) : null;
};

/** Splits a callout's first paragraph (marker already cut) at the end of its first line. */
const splitFirstLine = (children: Plain[]) => {
	const title: Plain[] = [];
	for (const [i, node] of children.entries()) {
		if (node.type === 'break') return { title, rest: children.slice(i + 1) };
		const value = node.type === 'text' ? (node.value as string) : '';
		const newline = value.indexOf('\n');
		if (newline !== -1) {
			if (newline > 0) title.push({ type: 'text', value: value.slice(0, newline) });
			const after = value.slice(newline + 1);
			return { title, rest: [...(after ? [{ type: 'text', value: after }] : []), ...children.slice(i + 1)] };
		}
		title.push(node);
	}
	return { title, rest: [] };
};

const blank = (nodes: Plain[]) => nodes.every((n) => n.type === 'text' && !(n.value as string).trim());

/** A blockquote copy as a callout, with any callouts inside it rendered too. */
const toCallout = (blockquote: Plain, [whole, type = '', fold]: RegExpExecArray): Plain => {
	const [first, ...blocks] = blockquote.children as Plain[];
	const [text, ...inline] = first!.children!;
	const opening = (text!.value as string).slice(whole.length).replace(/^[ \t]+/, '');
	const { title, rest } = splitFirstLine([...(opening ? [{ type: 'text', value: opening }] : []), ...inline]);
	const titleText = blank(title) ? [{ type: 'text', value: type[0]!.toUpperCase() + type.slice(1) }] : title;
	const body = [...(blank(rest) ? [] : [{ ...first!, children: rest }]), ...blocks].map(renderCallouts);
	const foldable = fold === '+' || fold === '-';
	const head = element('calloutTitle', foldable ? 'summary' : 'div', 'callout-title', [
		element('calloutIcon', 'span', 'callout-icon', [], { ariaHidden: 'true' }),
		element('calloutTitleInner', 'span', 'callout-title-inner', titleText),
	]);
	const content = body.length ? [element('calloutContent', 'div', 'callout-content', body)] : [];
	return element('callout', foldable ? 'details' : 'div', 'callout', [head, ...content], {
		dataCallout: type.toLowerCase(),
		...(fold === '+' ? { open: true } : {}),
	});
};

/** A plain node with every callout in it rendered. */
const renderCallouts = (node: Plain): Plain => {
	const match = node.type === 'blockquote' ? calloutMarker(node) : null;
	if (match) return toCallout(node, match);
	return node.children ? { ...node, children: node.children.map(renderCallouts) } : node;
};

/** Callouts below `node`, queued as edits: each outermost callout blockquote is replaced. */
const visit = (node: Node, ctx: Parameters<NonNullable<MdastPlugin['before']>>[1]) => {
	const match = node.type === 'blockquote' ? calloutMarker(node) : null;
	if (!match) {
		for (const child of node.children ?? []) visit(child, ctx);
		return;
	}
	// Plain copies keep their positions (inline-tags reads them); only the split title line loses them.
	const copy = JSON.parse(JSON.stringify(node)) as Plain;
	ctx.replaceNode(node as never, toCallout(copy, match) as MdastContent);
};

export const callouts = {
	name: 'callouts',
	options: { position: true },
	before(root, ctx) {
		visit(root as Node, ctx);
	},
} satisfies MdastPlugin;
