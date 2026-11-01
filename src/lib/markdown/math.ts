// Obsidian math as MathML (Temml), under Obsidian's own `$` rules, which are stricter than
// Sätteri's math parser (`features.math`):
// - `$x$` is inline math only with no whitespace right inside either `$`, so `$5 and $6` is text.
// - `$$x$$` is display math only as a paragraph's whole content; mid-paragraph it's text.
// - A `$$` block (its own lines, also in a list, blockquote or callout) is display math.
// A rejected `$…$` becomes the text it was written as. Display math scrolls sideways in its own
// region, like tables (table-scroll.ts). `\$` is a dollar sign, and `$` in code stays as written.
// Fails the build, naming the file, on what it can't show as Obsidian does:
// - a `$$` block with no closing `$$` line (Sätteri would swallow the rest of the note), or text
//   after the opening `$$` (Sätteri would drop it);
// - invalid TeX (Obsidian shows it red in place);
// - a `$` Obsidian would pair after a rejected one (`$5 and $6 money$`): the author writes `\$`.
// Runs right after comments, before callouts: the rules read the source, and nodes callouts
// rebuilds lose their source positions.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';
import temml from 'temml';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;
type Ctx = Parameters<NonNullable<MdastPlugin['before']>>[1];
type Node = {
	readonly type: string;
	readonly value?: unknown;
	readonly children?: readonly Node[];
	readonly position?: { start: { offset?: number }; end: { offset?: number } };
};
type Range = { start: number; end: number };

const SNIPPET_CONTEXT = 20;
// Repo root, to name the file as `content/articles/<note>.md`.
const ROOT = new URL('../../../', import.meta.url).href;
// Blocks whose inline math is checked together for Obsidian's `$` pairing.
const inlineBlocks = new Set(['paragraph', 'heading', 'tableCell']);
// Blockquote and list prefixes on a line of a `$$` block.
const linePrefix = /^[ \t>]*/;

const offsets = (node: Node): Range | undefined => {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	return start == null || end == null ? undefined : { start, end };
};

const fileName = (fileURL: URL | undefined) => (fileURL ? decodeURI(fileURL.href.replace(ROOT, '')) : 'a markdown file');

const snippet = (source: string, at: Range) =>
	source
		.slice(Math.max(0, at.start - SNIPPET_CONTEXT), at.end + SNIPPET_CONTEXT)
		.replace(/\s+/g, ' ')
		.trim();

const failRaw = (source: string, at: Range, ctx: Ctx, hint: string): never => {
	throw new Error(`Raw Obsidian syntax in ${fileName(ctx.fileURL)}: "${snippet(source, at)}" (${hint})`);
};

const render = (tex: string, displayMode: boolean, ctx: Ctx) => {
	try {
		return temml.renderToString(tex, { displayMode, throwOnError: true });
	} catch (error) {
		if (!(error instanceof temml.ParseError)) throw error;
		const flat = tex.replace(/\s+/g, ' ').trim();
		throw new Error(`Invalid math in ${fileName(ctx.fileURL)}: "${flat}": ${(error as Error).message.trim()}`);
	}
};

const display = (tex: string, ctx: Ctx): MdastContent => ({
	type: 'html',
	value: `<div class="math-display" tabindex="0" role="region" aria-label="Formula">${render(tex, true, ctx)}</div>`,
});

/** The source of a math node, as written, with blockquote and list prefixes dropped. */
const written = (source: string, at: Range) => source.slice(at.start, at.end).replace(/\n[ \t>]*/g, '\n');

/** A `$…$` Obsidian reads as math: no whitespace right inside either `$`. */
const obsidianInline = (slice: string) => {
	if (slice.startsWith('$$')) return false;
	const inner = slice.slice(1, -1);
	return inner.length > 0 && !/^\s|\s$/.test(inner);
};

/** A paragraph that is only `$$…$$`, which Obsidian shows as display math. */
const wholeDisplay = (node: Node, source: string) => {
	if (node.type !== 'paragraph') return undefined;
	const content = (node.children ?? []).filter((c) => !(c.type === 'text' && !(c.value as string).trim()));
	const only = content.length === 1 ? content[0]! : undefined;
	const at = only?.type === 'inlineMath' ? offsets(only) : undefined;
	return at && source.startsWith('$$', at.start) ? only : undefined;
};

/**
 * Obsidian's single-`$` pairs in a block's source: an opener has a non-space after it, its closer
 * the next `$` with a non-space before it. `\$`, `$$` and code spans hold no delimiter.
 */
const obsidianPairs = (source: string, at: Range): Range[] => {
	const text = source
		.slice(at.start, at.end)
		.replace(/(`+)[\s\S]*?\1/g, (code) => ' '.repeat(code.length))
		.replace(/\\[\s\S]/g, '  ')
		.replace(/\${2,}/g, (run) => ' '.repeat(run.length));
	const pairs: Range[] = [];
	for (let open = text.indexOf('$'); open !== -1; open = text.indexOf('$', open + 1)) {
		if (/\s/.test(text[open + 1] ?? ' ')) continue;
		let close = text.indexOf('$', open + 1);
		while (close !== -1 && /\s/.test(text[close - 1]!)) close = text.indexOf('$', close + 1);
		if (close === -1) continue;
		pairs.push({ start: at.start + open, end: at.start + close + 1 });
		open = close;
	}
	return pairs;
};

/** Renders or rejects the inline math directly in an inline block, and checks its `$` pairing. */
const inlineBlock = (block: Node, source: string, ctx: Ctx) => {
	const rendered: Range[] = [];
	let rejected = false;
	const visit = (node: Node) => {
		for (const child of node.children ?? []) {
			const at = child.type === 'inlineMath' ? offsets(child) : undefined;
			if (!at) {
				visit(child);
				continue;
			}
			const slice = source.slice(at.start, at.end);
			if (obsidianInline(slice)) {
				rendered.push(at);
				ctx.replaceNode(child as never, { type: 'html', value: render(child.value as string, false, ctx) });
			} else {
				rejected = true;
				ctx.replaceNode(child as never, { type: 'text', value: written(source, at) });
			}
		}
	};
	visit(block);
	const at = offsets(block);
	if (!rejected || !at) return;
	for (const pair of obsidianPairs(source, at)) {
		if (!rendered.some((r) => r.start === pair.start && r.end === pair.end)) {
			failRaw(source, pair, ctx, 'Obsidian reads this as math; write \\$ for a dollar sign');
		}
	}
};

/** A `$$` block: fails unless `$$` stands alone on its opening and closing lines. */
const block = (node: Node, source: string, ctx: Ctx) => {
	const at = offsets(node);
	if (!at) return;
	const lines = source.slice(at.start, at.end).trimEnd().split('\n');
	const first = lines[0]!.trim();
	const last = lines.at(-1)!.replace(linePrefix, '').trim();
	if (first !== '$$') failRaw(source, at, ctx, 'put $$ on its own line');
	if (lines.length < 2 || last !== '$$') failRaw(source, at, ctx, 'close it with $$ on its own line');
	ctx.replaceNode(node as never, display(node.value as string, ctx));
};

const visit = (node: Node, source: string, ctx: Ctx) => {
	if (node.type === 'math') return block(node, source, ctx);
	const whole = wholeDisplay(node, source);
	if (whole) return ctx.replaceNode(node as never, display(whole.value as string, ctx));
	if (inlineBlocks.has(node.type)) return inlineBlock(node, source, ctx);
	for (const child of node.children ?? []) visit(child, source, ctx);
};

export const math = {
	name: 'math',
	options: { position: true },
	before(root, ctx) {
		visit(root as Node, ctx.source, ctx);
	},
} satisfies MdastPlugin;
