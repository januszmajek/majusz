// How the browser loads an article's images. The first image in one of the body's first three
// blocks is likely the largest thing on screen at load (the LCP element), so it gets `priority`:
// Astro's image service turns that into `loading=eager`, `decoding=sync`, `fetchpriority=high`
// and emits no `priority` attribute. Every later image stays lazy. Full-width images (no `|300`
// from image-width) get `sizes` for the prose column, so the browser picks a srcset variant that
// fits it instead of one for the whole viewport; a `|300` image keeps the sizes Astro computes
// for its width. Runs after image-width and before Astro's image marker, which hands every
// `<img>` property to the image service.
//
// Remote (`https:`), protocol-relative (`//`) and root-absolute (`/`) images never reach the image
// service, so they ship as written: `priority` would be a stray attribute and `sizes` means
// nothing without a srcset. They are skipped and don't use up the priority slot.
//
// A factory: Sätteri calls it once per document, so "one priority image" is counted per
// article. A module-level flag would carry over from one file to the next.
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type HastPlugin = Extract<NonNullable<SatteriProcessorOptions['hastPlugins']>[number], { name: string }>;
type HastNode = Parameters<NonNullable<HastPlugin['before']>>[0]['children'][number];

// The prose column (prose.css): 41.5rem wide from a 46rem viewport up, the viewport minus the
// page gutters below it.
export const COLUMN_SIZES = '(min-width: 46rem) 41.5rem, calc(100vw - 2.5rem)';
// Images whose top-level block is one of the first this many blocks may get priority.
const LEADING_BLOCKS = 3;

// The whitespace between blocks and HTML comments are root children too; they aren't blocks.
const isBlock = (node: HastNode) =>
	!(node.type === 'comment' || (node.type === 'text' && node.value.trim() === ''));

// A URL scheme, `//` or a leading `/`: an image Astro's image service does not process.
const UNPROCESSED = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i;

export const imagePriority = (): HastPlugin => {
	let done = false;
	return {
		name: 'image-priority',
		element: {
			filter: ['img'],
			visit(node, ctx) {
				if (UNPROCESSED.test(String(node.properties?.src ?? ''))) return;
				if (!('width' in (node.properties ?? {}))) ctx.setProperty(node, 'sizes', COLUMN_SIZES);
				// Only the document's first image is a candidate.
				if (done) return;
				done = true;

				// The image's ancestor that is a child of the document root.
				let top: HastNode = node;
				let parent = ctx.parent(node);
				while (parent && parent.type !== 'root') {
					top = parent;
					parent = ctx.parent(parent);
				}
				if (!parent) return;
				const index = ctx.indexOf(top) ?? Infinity;
				const block = parent.children.slice(0, index).filter(isBlock).length;
				if (block >= LEADING_BLOCKS) return;

				ctx.setProperty(node, 'priority', true);
			},
		},
	};
};
