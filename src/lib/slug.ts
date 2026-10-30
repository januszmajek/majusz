/**
 * `Zażółć gęślą jaźń` → `zazolc-gesla-jazn`: the ASCII kebab slug of an article title.
 * `ł` has no Unicode decomposition, so it is mapped by hand before NFD strips the marks.
 */
export const toSlug = (title: string) =>
	title
		.toLowerCase()
		.replaceAll('ł', 'l')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

/**
 * An article's id, and so its URL: the `slug` property (YAML reads `slug: 2026` as a number),
 * else the slugified title. `undefined` when neither gives one. Shared by the content collection
 * and the wikilink index, so a link never points at a URL the collection didn't build.
 * Imported by markdown plugins through a relative path, so no `@/` imports here.
 */
export const articleId = (data: { slug?: unknown; title?: unknown }): string | undefined => {
	if (data.slug != null) return String(data.slug);
	if (typeof data.title !== 'string') return undefined;
	return toSlug(data.title) || undefined;
};
