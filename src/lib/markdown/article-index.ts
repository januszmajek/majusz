// Where a link to another note goes. Obsidian resolves `[[Other note]]` by file name, but an
// article's URL is its `slug` property or slugified title, so links resolve through an index of
// content/articles/: lowercase file name → article id. A note missing from the index isn't
// published, and the link renders as plain text.
// Imported by astro.config.mjs, so relative imports only (no `@/`).
import { readdirSync, readFileSync } from 'node:fs';
import GithubSlugger from 'github-slugger';
import { parse } from 'yaml';
import { articleId } from '../slug.ts';

const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Read on every call: cheap, and keeps the dev server close to the files on disk. */
export const loadArticleIndex = (dir: URL): Map<string, string> => {
	const index = new Map<string, string>();
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.md')) continue;
		const yaml = frontmatter.exec(readFileSync(new URL(encodeURIComponent(file), dir), 'utf8'))?.[1];
		let data: unknown;
		try {
			data = yaml ? parse(yaml) : undefined;
		} catch {
			// Broken frontmatter fails the collection's build on its own; here the note just isn't linkable.
			continue;
		}
		const id = data && typeof data === 'object' ? articleId(data) : undefined;
		if (id) index.set(file.slice(0, -'.md'.length).toLowerCase(), id);
	}
	return index;
};

/**
 * `Other note#Some heading` → `{ href: '/other-note#some-heading' }`, or `null` when the note isn't
 * published. `target` is decoded and may carry `.md`, a folder path (only the file name counts, as
 * in Obsidian), and a `#heading` or `#^block` suffix. A block reference links to the page, and a
 * heading uses Astro's heading id (github-slugger), so a heading the target lacks lands at the top.
 * A bare `#heading` links within the current article.
 */
export const resolveNoteLink = (target: string, index: Map<string, string>): { href: string } | null => {
	const [rawPath = '', ...fragments] = target.split('#');
	const path = rawPath.trim();
	// `Note#Section#Subsection` (Obsidian's nested heading link) goes to the last heading.
	const fragment = fragments.map((f) => f.trim()).findLast(Boolean) ?? '';
	const heading = fragment && !fragment.startsWith('^') ? `#${new GithubSlugger().slug(fragment)}` : '';
	if (!path) return heading ? { href: heading } : null;
	const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '').toLowerCase();
	const id = index.get(name);
	return id ? { href: `/${id}${heading}` } : null;
};
