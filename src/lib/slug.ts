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
