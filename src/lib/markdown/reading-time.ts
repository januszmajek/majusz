// Reading time for the article meta line, read by the route as
// `render(entry).remarkPluginFrontmatter.minutesRead`.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type MdastPlugin = Extract<NonNullable<SatteriProcessorOptions['mdastPlugins']>[number], { name: string }>;
type Node = { readonly type: string; readonly value?: unknown; readonly children?: readonly Node[] };

const WORDS_PER_MINUTE = 200;
// Locale-free word boundaries; handles Polish and English alike.
const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

// Prose text only: `code` and `inlineCode` are their own node types, so code is never counted.
const proseText = (node: Node): string[] =>
	node.type === 'text' && typeof node.value === 'string' ? [node.value] : (node.children ?? []).flatMap(proseText);

const countWords = (text: string) => {
	let words = 0;
	for (const segment of segmenter.segment(text)) if (segment.isWordLike) words++;
	return words;
};

export const readingTime = {
	name: 'reading-time',
	after(root, ctx) {
		const words = countWords(proseText(root).join(' '));
		const astro = ctx.data.astro;
		if (astro) astro.frontmatter.minutesRead = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
	},
} satisfies MdastPlugin;
