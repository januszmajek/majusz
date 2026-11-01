// Mermaid diagrams as inline SVG, rendered at build time by Pele, the renderer Obsidian 1.15 uses,
// so a ```mermaid fence lays out as it does in Obsidian's reading view. Caught as an mdast `code`
// node, before Shiki would highlight it. The SVG keeps its natural width inside a region that
// scrolls sideways, like tables (table-scroll.ts), and takes its colours and font from the
// `--pele-*` variables prose.css sets, so one SVG follows the site theme.
// Links between notes follow the wikilink rule (obsidian-links.ts): a node with
// `class X internal-link`, or a `click X "Other note"` that isn't a URL, goes to the article when
// the note is published, and is plain text otherwise, with the note name in no attribute.
// Invalid mermaid fails the build, naming the file (Obsidian shows the error in place).
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import { PeleError, render, type TextMeasurer } from 'pele';
import { loadArticleIndex, resolveNoteLink } from './article-index.ts';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

// Repo root, to name the file as `content/articles/<note>.md`.
const ROOT = new URL('../../../', import.meta.url);
const ARTICLES = new URL('content/articles/', ROOT);
// Per document, in the compile's data bag: renders can run concurrently.
const INDEX_KEY = 'diagramsIndex';
const COUNT_KEY = 'diagramsCount';

// Iosevka is monospaced at half an em per character, in every weight and style.
const iosevka: TextMeasurer = { width: (text, size) => [...text].length * size * 0.5 };
// A fallback only: prose.css sets `--pele-font`, which the SVG reads first.
const FONT = 'Iosevka, ui-monospace, monospace';

// A link Pele wrote: `class X internal-link` adds `data-href`; `click X "…"` writes only `href`.
const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
const attribute = (attrs: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1];
// A URL with a scheme, site-absolute or a fragment: not a note name.
const url = /^(?:[a-z][a-z\d+.-]*:|[/#])/i;

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (value: string) =>
	value.replace(/&(?:#x([\da-f]+)|#(\d+)|(\w+));/gi, (whole, hex, dec, name) =>
		hex ? String.fromCodePoint(parseInt(hex, 16)) : dec ? String.fromCodePoint(Number(dec)) : (entities[name] ?? whole),
	);
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Each note link goes to its article, or is unwrapped to its label when the note isn't published. */
const resolveLinks = (svg: string, index: Map<string, string>) =>
	svg.replace(anchor, (whole, attrs: string, inner: string) => {
		const internal = /\sclass="internal-link"/.test(attrs);
		const target = internal ? attribute(attrs, 'data-href') : attribute(attrs, 'href');
		if (target == null || (!internal && url.test(decode(target)))) return whole;
		const resolved = resolveNoteLink(decode(target), index);
		return resolved ? `<a class="internal-link" href="${escape(resolved.href)}">${inner}</a>` : inner;
	});

/** Without an `accTitle`, the SVG is named by its type: `pele-flowchart` → "Flowchart diagram". */
const name = (svg: string) => {
	const root = /^<svg\b[^>]*>/.exec(svg)?.[0];
	if (!root || /\saria-labelledby="/.test(root)) return svg;
	const type = /\sclass="pele pele-([\w-]+)/.exec(root)?.[1] ?? '';
	const label = `${type.charAt(0).toUpperCase()}${type.slice(1)} diagram`.trim();
	const named = root.replace(/\srole="[^"]*"/, '').replace(/^<svg\b/, `<svg role="img" aria-label="${escape(label)}"`);
	return named + svg.slice(root.length);
};

export const createDiagrams = ({ loadIndex }: { loadIndex: () => Map<string, string> }) =>
	({
		name: 'diagrams',
		before(_root, ctx) {
			ctx.data[INDEX_KEY] = loadIndex();
			ctx.data[COUNT_KEY] = 0;
		},
		code(node, ctx) {
			if (node.lang !== 'mermaid') return;
			const n = (ctx.data[COUNT_KEY] as number) + 1;
			ctx.data[COUNT_KEY] = n;
			let svg: string;
			try {
				// `responsive: false` drops Pele's inline `max-width:100%`: the region scrolls instead.
				({ svg } = render(node.value, { idPrefix: `diagram-${n}-`, fontFamily: FONT, measurer: iosevka, responsive: false }));
			} catch (error) {
				if (!(error instanceof PeleError)) throw error;
				const file = ctx.fileURL ? decodeURI(ctx.fileURL.href.replace(ROOT.href, '')) : 'a markdown file';
				throw new Error(`Invalid diagram in ${file}: ${error.message.trim()}`);
			}
			svg = name(resolveLinks(svg, ctx.data[INDEX_KEY] as Map<string, string>));
			ctx.replaceNode(node, {
				type: 'html',
				value: `<div class="diagram" tabindex="0" role="region" aria-label="Diagram">${svg}</div>`,
			});
		},
	}) satisfies MdastPlugin;

export const diagrams = createDiagrams({ loadIndex: () => loadArticleIndex(ARTICLES) });
