// subset-font ships no types; this covers the options the site uses.
declare module 'subset-font' {
	export default function subsetFont(
		font: Buffer,
		text: string,
		options?: { targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype'; noLayoutClosure?: boolean },
	): Promise<Buffer>;
}
