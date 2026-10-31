// Obsidian's highlight, `==text==`, as `<mark>`: also around formatting, code and links
// (`==**bold** and `code`==`). A `==` opens when followed by a non-space and closes when preceded
// by one, so `a == b` stays text; a run of three or more `=` is never a delimiter. Delimiters
// pair among the children of one parent: a highlight crossing formatting levels
// (`**==a** b==`) can't, and obsidian-guard fails the build on it.
// Only `text` nodes hold delimiters, so `==` in backticks or a code block stays as written.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;
type Node = { readonly type: string; readonly value?: unknown; readonly children?: readonly Node[] };
type Plain = { type: string; value?: unknown; children?: Plain[]; [key: string]: unknown };
/** A delimiter that pairs: child `child`, character `index` of its value. */
type Delimiter = { child: number; index: number };

const DELIMITER = /(?<!=)==(?!=)/g;
const space = /\s/;

const startsBlank = (node: Node | undefined) =>
	!node || node.type === 'break' || (node.type === 'text' && space.test((node.value as string)[0] ?? ' '));
const endsBlank = (node: Node | undefined) =>
	!node || node.type === 'break' || (node.type === 'text' && space.test((node.value as string).at(-1) ?? ' '));

/** The delimiters among `children` that pair, in order (opener, closer, opener, …). */
const pairs = (children: readonly Node[]) => {
	const found: Delimiter[] = [];
	let open: Delimiter | undefined;
	children.forEach((node, child) => {
		if (node.type !== 'text') return;
		const value = node.value as string;
		for (const { index } of value.matchAll(DELIMITER)) {
			const after = value[index + 2];
			const before = value[index - 1];
			const opens = after != null ? !space.test(after) : !startsBlank(children[child + 1]);
			const closes = before != null ? !space.test(before) : !endsBlank(children[child - 1]);
			if (open && closes) {
				found.push(open, { child, index });
				open = undefined;
			} else if (!open && opens) open = { child, index };
		}
	});
	return found;
};

/** `children` with every highlight, at this level and below, turned into a `mark`. */
const highlightAll = (children: Plain[]): Plain[] => {
	const delimiters = pairs(children);
	const out: Plain[] = [];
	let mark: Plain[] | undefined;
	const emit = (node: Plain) => (mark ?? out).push(node);
	const text = (value: string) => value && emit({ type: 'text', value });
	children.forEach((node, child) => {
		const here = delimiters.filter((d) => d.child === child);
		if (!here.length) {
			emit(node.children ? { ...node, children: highlightAll(node.children) } : node);
			return;
		}
		const value = node.value as string;
		let from = 0;
		for (const { index } of here) {
			text(value.slice(from, index));
			if (mark) {
				out.push({ type: 'highlight', data: { hName: 'mark' }, children: mark });
				mark = undefined;
			} else mark = [];
			from = index + 2;
		}
		text(value.slice(from));
	});
	return out;
};

/** Highlights below `node`, queued as edits: each parent holding one gets new children. */
const visit = (node: Node, ctx: Parameters<NonNullable<MdastPlugin['before']>>[1]) => {
	const children = node.children ?? [];
	if (!pairs(children).length) {
		for (const child of children) visit(child, ctx);
		return;
	}
	// Plain copies keep their positions (inline-tags reads them); only split text loses them.
	const copies = children.map((child) => JSON.parse(JSON.stringify(child)) as Plain);
	ctx.replaceNode(children[0] as never, highlightAll(copies) as MdastContent[]);
	for (const child of children.slice(1)) ctx.removeNode(child as never);
};

export const highlight = {
	name: 'highlight',
	options: { position: true },
	before(root, ctx) {
		visit(root as Node, ctx);
	},
} satisfies MdastPlugin;
