// Links between notes, as Obsidian writes them: `[[Other note]]`, `[[Other note|text]]`,
// `[[Other note#Heading]]`, and the relative markdown links the site vault writes by default
// (`[text](Other%20note.md)`). A link to a published article goes to its page; a link to any
// other note renders as plain text (PRD FR-009), so nothing looks broken. That text is the
// alias, else the note's file name: never its folder path, which could be private.
// Runs before obsidian-guard, which still fails the build on any `[[` left unconsumed.
// Only `text` nodes are split, so `[[x]]` in backticks or a code block stays as written.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';
import { loadArticleIndex, resolveNoteLink } from './article-index.ts';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

const ARTICLES = new URL('../../../content/articles/', import.meta.url);
// Per document, in the compile's data bag: renders can run concurrently.
const INDEX_KEY = 'obsidianLinksIndex';

const wikilink = /(?<!!)\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;
// A relative link to a `.md` file: no scheme, not site-absolute, not a bare fragment.
const noteLink = /^(?![a-z][a-z\d+.-]*:|[/#])([^#?]*\.md)(?:#(.*))?$/i;

/** `folder/Other note.md#Heading` → `Other note > Heading`; a `#^block` suffix is dropped. */
const displayText = (target: string) => {
	const [path = '', ...fragments] = target.split('#');
	const name = path.trim().slice(path.trim().lastIndexOf('/') + 1).replace(/\.md$/i, '');
	const headings = fragments.map((f) => f.trim()).filter((f) => f && !f.startsWith('^'));
	return [name, ...headings].filter(Boolean).join(' > ') || target.trim();
};

const decode = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

export const createObsidianLinks = (loadIndex: () => Map<string, string>) =>
	({
		name: 'obsidian-links',
		before(_root, ctx) {
			ctx.data[INDEX_KEY] = loadIndex();
		},
		text(node, ctx) {
			const text = node.value;
			const index = ctx.data[INDEX_KEY] as Map<string, string>;
			const pieces: MdastContent[] = [];
			let plain = '';
			let last = 0;
			for (const match of text.matchAll(wikilink)) {
				const [whole, target = '', alias] = match;
				const label = alias?.trim() || displayText(target);
				const resolved = resolveNoteLink(target, index);
				plain += text.slice(last, match.index);
				if (resolved) {
					if (plain) pieces.push({ type: 'text', value: plain });
					pieces.push({ type: 'link', url: resolved.href, children: [{ type: 'text', value: label }] });
					plain = '';
				} else {
					plain += label;
				}
				last = match.index + whole.length;
			}
			if (last === 0) return;
			plain += text.slice(last);
			if (plain) pieces.push({ type: 'text', value: plain });
			ctx.replaceNode(node, pieces);
		},
		link(node, ctx) {
			const match = noteLink.exec(node.url);
			if (!match) return;
			const [, path = '', fragment] = match;
			const target = fragment == null ? decode(path) : `${decode(path)}#${decode(fragment)}`;
			const resolved = resolveNoteLink(target, ctx.data[INDEX_KEY] as Map<string, string>);
			if (resolved) ctx.setProperty(node, 'url', resolved.href);
			else ctx.replaceNode(node, node.children);
		},
	}) satisfies MdastPlugin;

export const obsidianLinks = createObsidianLinks(() => loadArticleIndex(ARTICLES));
