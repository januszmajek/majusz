// Obsidian comments (`%%hidden%%`) are hidden from the page, as in Obsidian: inline, on their own
// lines, or across paragraphs, list items and formatting. Obsidian strips them before parsing, so
// a comment is a source range: from an opening `%%` to the next `%%`, whatever lies between.
// Runs first, so nothing inside a comment is resolved (wikilinks, embeds), counted for reading
// time or guarded. A `%%` with no closer fails the build: in Obsidian it hides the rest of the
// note, and a typo shouldn't silently cut an article short.
// Only `text` nodes hold delimiters, so `%%` in backticks or a code block stays as written.
// Comments stay in the public repo's markdown (content/README.md).
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;
type Ctx = Parameters<NonNullable<MdastPlugin['before']>>[1];
type Node = {
	readonly type: string;
	readonly value?: unknown;
	readonly children?: readonly Node[];
	readonly position?: { start: { offset?: number }; end: { offset?: number } };
};
/** A comment, as source offsets: `start` at the opening `%%`, `end` after the closing one. */
type Range = { start: number; end: number };

const DELIMITER = '%%';
const SNIPPET_CONTEXT = 20;
// Repo root, to name the file as `content/articles/<note>.md`.
const ROOT = new URL('../../../', import.meta.url).href;
// Emptied by a comment, these go too: an empty table cell or row would break the table.
const keepWhenEmpty = new Set(['root', 'table', 'tableRow', 'tableCell']);

const offsets = (node: Node) => {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	return start == null || end == null ? undefined : { start, end };
};

const indexesOf = (text: string) => {
	const found: number[] = [];
	for (let i = text.indexOf(DELIMITER); i !== -1; i = text.indexOf(DELIMITER, i + DELIMITER.length)) found.push(i);
	return found;
};

/**
 * Each delimiter in a text node, as an index into its value and an offset into the source. The
 * k-th `%%` in the value is the k-th in the source; when escapes make the counts differ, the
 * value index stands in for both.
 */
const delimiters = (node: Node, source: string) => {
	const value = node.value as string;
	const inValue = indexesOf(value);
	const at = offsets(node);
	if (!inValue.length || !at) return [];
	const inSource = indexesOf(source.slice(at.start, at.end));
	return inValue.map((index, k) => ({
		node,
		index,
		offset: at.start + (inSource.length === inValue.length ? inSource[k]! : index),
	}));
};

const textNodes = (node: Node): Node[] =>
	node.type === 'text' ? [node] : (node.children ?? []).flatMap(textNodes);

const fail = (source: string, offset: number, fileURL: URL | undefined): never => {
	const file = fileURL ? decodeURI(fileURL.href.replace(ROOT, '')) : 'a markdown file';
	const snippet = source
		.slice(Math.max(0, offset - SNIPPET_CONTEXT), offset + DELIMITER.length + SNIPPET_CONTEXT)
		.replace(/\s+/g, ' ')
		.trim();
	throw new Error(`Unclosed %% comment in ${file}: "${snippet}" (close it with another %%)`);
};

/** The parts of a text node's value outside every comment, joined. */
const visibleText = (node: Node, ranges: Range[], source: string) => {
	const value = node.value as string;
	const marks = delimiters(node, source);
	const at = offsets(node)!;
	let kept = '';
	let from = 0;
	// Inside a comment at the node's start when a range opened before it.
	let hidden = ranges.some((r) => r.start < at.start && r.end > at.start);
	for (const mark of marks) {
		if (!hidden) kept += value.slice(from, mark.index);
		hidden = !hidden;
		from = mark.index + DELIMITER.length;
	}
	if (!hidden) kept += value.slice(from);
	return kept;
};

/**
 * Queues the edits for `node` and says what's left of it: `gone` (wholly inside a comment, or a
 * container a comment emptied), `blank` (whitespace only) or `kept`. A `gone` node is left to its
 * parent to remove, so no edit lands on a node that's about to go; a `blank` one stays unless its
 * container goes, so `**a** %%x%% **b**` keeps the space between.
 */
const hide = (node: Node, ranges: Range[], source: string, ctx: Ctx): 'gone' | 'blank' | 'kept' => {
	const at = offsets(node);
	if (!at) return 'kept';
	if (node.type !== 'root' && ranges.some((r) => r.start <= at.start && at.end <= r.end)) return 'gone';
	if (!ranges.some((r) => r.start < at.end && at.start < r.end)) return 'kept';
	if (node.type === 'text') {
		const kept = visibleText(node, ranges, source);
		if (!kept) return 'gone';
		if (kept !== node.value) ctx.setProperty(node as never, 'value' as never, kept as never);
		return kept.trim() ? 'kept' : 'blank';
	}
	const children = node.children ?? [];
	const left = children.map((child) => hide(child, ranges, source, ctx));
	if (!left.includes('kept') && !keepWhenEmpty.has(node.type)) return 'gone';
	children.forEach((child, i) => {
		if (left[i] === 'gone') ctx.removeNode(child as never);
	});
	return 'kept';
};

export const comments = {
	name: 'comments',
	options: { position: true },
	before(root, ctx) {
		const source = ctx.source;
		const marks = textNodes(root as Node).flatMap((node) => delimiters(node, source));
		if (marks.length % 2) fail(source, marks.at(-1)!.offset, ctx.fileURL);
		const ranges: Range[] = [];
		for (let i = 0; i < marks.length; i += 2) {
			ranges.push({ start: marks[i]!.offset, end: marks[i + 1]!.offset + DELIMITER.length });
		}
		if (ranges.length) hide(root as Node, ranges, source, ctx);
	},
} satisfies MdastPlugin;
