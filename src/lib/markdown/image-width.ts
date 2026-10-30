// Obsidian's image width, `![alt|300](photo.png)`: the image renders at most 300 px wide
// instead of full measure, and `alt|300` becomes plain `alt`. Runs before Astro's image
// marker, so the width reaches the image service and the srcset is built for it.
// `|300x200` fails the build: Obsidian distorts the image to both sizes, and the site won't.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type HastPlugin = Extract<NonNullable<SatteriProcessorOptions['hastPlugins']>[number], { name: string }>;

const size = /^(.*?)\s*\|\s*(\d+)(x\d+)?$/;
// Repo root, to name the file as `content/articles/<note>.md`.
const ROOT = new URL('../../../', import.meta.url).href;

export const imageWidth = {
	name: 'image-width',
	element: {
		filter: ['img'],
		visit(node, ctx) {
			const alt = node.properties?.alt;
			const match = typeof alt === 'string' ? size.exec(alt) : null;
			if (!match) return;
			const [, text, width, height] = match;
			if (height) {
				const file = ctx.fileURL ? decodeURI(ctx.fileURL.href.replace(ROOT, '')) : 'a markdown file';
				throw new Error(`Image size "|${width}${height}" in ${file}: use a width only, like "|${width}"`);
			}
			ctx.setProperty(node, 'alt', text);
			ctx.setProperty(node, 'width', Number(width));
		},
	},
} satisfies HastPlugin;
