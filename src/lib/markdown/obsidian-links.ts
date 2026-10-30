// Links between notes, as Obsidian writes them: `[[Other note]]`, `[[Other note|text]]`,
// `[[Other note#Heading]]`, and the relative markdown links the site vault writes by default
// (`[text](Other%20note.md)`, or as a reference, `[text][ref]` + `[ref]: Other%20note.md`). A link to a published article goes to its page; a link to any
// other note renders as plain text (PRD FR-009), so nothing looks broken. That text is the
// alias, else the note's file name: never its folder path, which could be private.
// Image embeds (`![[photo.png|alt|300]]`) become markdown images from content/attachments/, so
// Astro optimizes them and image-width applies `|300`. Note embeds (`![[Other note]]`) are out
// of v1 (PRD FR-009) and stay as text for obsidian-guard to fail the build on, as does any `[[`
// left unconsumed.
// Only `text` nodes are split, so `[[x]]` in backticks or a code block stays as written.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import type { MdastContent } from 'satteri';
import { readdirSync } from 'node:fs';
import { loadArticleIndex, resolveNoteLink } from './article-index.ts';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;

// Repo root, to name the file as `content/articles/<note>.md`.
const ROOT = new URL('../../../', import.meta.url);
const ARTICLES = new URL('content/articles/', ROOT);
const ATTACHMENTS = new URL('content/attachments/', ROOT);
// Per document, in the compile's data bag: renders can run concurrently.
const INDEX_KEY = 'obsidianLinksIndex';
const ATTACHMENTS_KEY = 'obsidianLinksAttachments';

// `[[target|alias]]` or `![[target|parts]]`; an embed's parts may hold several pipes.
const wikilink = /(!?)\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;
const imageExtension = /\.(?:png|jpe?g|webp|gif|svg|avif)$/i;
// Obsidian's `|300`, and `|300x200`, which image-width rejects with a message.
const size = /^\d+(?:x\d+)?$/;
// A relative link to a `.md` file: no scheme, not site-absolute, not a bare fragment. A query
// string is dropped.
const noteLink = /^(?![a-z][a-z\d+.-]*:|[/#])([^#?]*\.md)(?:\?[^#]*)?(?:#(.*))?$/i;

/** `folder/Other note.md#Heading` → `Other note > Heading`; a `#^block` suffix is dropped. */
const displayText = (target: string) => {
	const [path = '', ...fragments] = target.split('#');
	const name = path.trim().slice(path.trim().lastIndexOf('/') + 1).replace(/\.md$/i, '');
	const headings = fragments.map((f) => f.trim()).filter((f) => f && !f.startsWith('^'));
	return [name, ...headings].filter(Boolean).join(' > ');
};

const decode = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

/**
 * `![[cat.png|A cat|300]]` → an image of `../attachments/cat.png` with alt `A cat|300`, for
 * image-width to turn into a width. The file is matched by name, case-insensitively, as in
 * Obsidian; `attachments` maps lowercase file names to the names on disk.
 */
const imageEmbed = (target: string, parts: string | undefined, attachments: Map<string, string>, file: string) => {
	const name = target.trim().slice(target.trim().lastIndexOf('/') + 1);
	const actual = attachments.get(name.toLowerCase());
	if (!actual) throw new Error(`Image "${name}" in ${file}: no such file in content/attachments/`);
	const pieces = parts?.split('|').map((p) => p.trim()) ?? [];
	const width = pieces.length && size.test(pieces.at(-1)!) ? pieces.pop() : undefined;
	const alt = pieces.filter(Boolean).join(' ');
	return {
		type: 'image',
		url: `../attachments/${encodeURIComponent(actual)}`,
		alt: width ? `${alt}|${width}` : alt,
	} satisfies MdastContent;
};

/** `undefined` when `url` isn't a relative `.md` link; else as resolveNoteLink. */
const resolveNoteUrl = (url: string, index: Map<string, string>) => {
	const match = noteLink.exec(url);
	if (!match) return undefined;
	const [, path = '', fragment] = match;
	return resolveNoteLink(fragment == null ? decode(path) : `${decode(path)}#${decode(fragment)}`, index);
};

export const loadAttachments = (dir: URL) => new Map(readdirSync(dir).map((file) => [file.toLowerCase(), file]));

export const createObsidianLinks = ({
	loadIndex,
	loadAttachments,
}: {
	loadIndex: () => Map<string, string>;
	loadAttachments: () => Map<string, string>;
}) =>
	({
		name: 'obsidian-links',
		before(_root, ctx) {
			ctx.data[INDEX_KEY] = loadIndex();
			ctx.data[ATTACHMENTS_KEY] = loadAttachments();
		},
		text(node, ctx) {
			const text = node.value;
			const index = ctx.data[INDEX_KEY] as Map<string, string>;
			const file = ctx.fileURL ? decodeURI(ctx.fileURL.href.replace(ROOT.href, '')) : 'a markdown file';
			// A link can't hold a link: inside link text, a wikilink is just its text.
			let inLink = false;
			for (let p = ctx.parent(node); p && !inLink; p = ctx.parent(p)) inLink = p.type === 'link' || p.type === 'linkReference';
			const pieces: MdastContent[] = [];
			let plain = '';
			let last = 0;
			for (const match of text.matchAll(wikilink)) {
				const [whole, embed, target = '', alias] = match;
				plain += text.slice(last, match.index);
				last = match.index + whole.length;
				if (embed) {
					// A note embed stays as written, for obsidian-guard.
					if (!imageExtension.test(target.trim())) {
						plain += whole;
						continue;
					}
					if (plain) pieces.push({ type: 'text', value: plain });
					pieces.push(imageEmbed(target, alias, ctx.data[ATTACHMENTS_KEY] as Map<string, string>, file));
					plain = '';
					continue;
				}
				const label = alias?.trim() || displayText(target);
				// `[[ ]]`, `[[#]]`, `[[#^id]]`, `[[folder/]]`: nothing to show but raw syntax or a folder.
				if (!label) throw new Error(`Wikilink "${whole}" in ${file} has no note name`);
				const resolved = inLink ? null : resolveNoteLink(target, index);
				if (resolved) {
					if (plain) pieces.push({ type: 'text', value: plain });
					pieces.push({ type: 'link', url: resolved.href, children: [{ type: 'text', value: label }] });
					plain = '';
				} else {
					plain += label;
				}
			}
			if (last === 0) return;
			plain += text.slice(last);
			if (plain) pieces.push({ type: 'text', value: plain });
			ctx.replaceNode(node, pieces);
		},
		link(node, ctx) {
			const resolved = resolveNoteUrl(node.url, ctx.data[INDEX_KEY] as Map<string, string>);
			if (resolved) ctx.setProperty(node, 'url', resolved.href);
			else if (resolved === null) ctx.replaceNode(node, node.children);
		},
		// `[text][ref]` takes its URL from `[ref]: …`. Without a definition, Sätteri renders a
		// reference as its text, so removing an unpublished one leaves plain text.
		definition(node, ctx) {
			const resolved = resolveNoteUrl(node.url, ctx.data[INDEX_KEY] as Map<string, string>);
			if (resolved) ctx.setProperty(node, 'url', resolved.href);
			else if (resolved === null) ctx.removeNode(node);
		},
	}) satisfies MdastPlugin;

export const obsidianLinks = createObsidianLinks({
	loadIndex: () => loadArticleIndex(ARTICLES),
	loadAttachments: () => loadAttachments(ATTACHMENTS),
});
