import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { COLUMN_SIZES, imagePriority } from './image-priority.ts';
import { imageWidth } from './image-width.ts';

// Plain markdown images with relative paths: Astro's image marker turns each into an
// `__ASTRO_IMAGE_` attribute holding the properties handed to the image service.
const processor = await createSatteriMarkdownProcessor({
	hastPlugins: [imageWidth, imagePriority],
	syntaxHighlight: false,
});

const entities: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>' };

/** The properties each image hands to Astro's image service, in document order. */
const images = async (markdown: string): Promise<Record<string, unknown>[]> => {
	const html = (await processor.render(markdown)).code;
	return [...html.matchAll(/__ASTRO_IMAGE_="([^"]*)"/g)].map((m) =>
		JSON.parse(m[1].replace(/&(quot|amp|lt|gt);/g, (_, name: string) => entities[name])),
	);
};

describe('image priority', () => {
	it('give the first image priority when it is in the first block', async () => {
		const [first, second] = await images('![A](./a.png)\n\nText.\n\n![B](./b.png)');
		expect(first.priority).toBe(true);
		expect(second.priority).toBeUndefined();
	});

	it('count blocks, not the whitespace between them', async () => {
		const [image] = await images('# Title\n\nText.\n\n> ![A](./a.png)');
		expect(image.priority).toBe(true);
	});

	it('give no priority to an image that first appears in the fourth block', async () => {
		const found = await images('One.\n\nTwo.\n\nThree.\n\n![A](./a.png)\n\n![B](./b.png)');
		expect(found.map((image) => image.priority)).toEqual([undefined, undefined]);
	});

	it('give priority to one image per document', async () => {
		const found = await images('![A](./a.png) ![B](./b.png)\n\n![C](./c.png)');
		expect(found.filter((image) => image.priority)).toHaveLength(1);
		expect(found[0].priority).toBe(true);
	});

	it('count each document on its own', async () => {
		const [first] = await images('![A](./a.png)');
		const [second] = await images('![B](./b.png)');
		expect(first.priority).toBe(true);
		expect(second.priority).toBe(true);
	});

	it('give full-width images the column sizes', async () => {
		const found = await images('![A](./a.png)\n\nText.\n\n![B](./b.png)');
		expect(found.map((image) => image.sizes)).toEqual([COLUMN_SIZES, COLUMN_SIZES]);
	});

	it('leave the sizes of a `|300` image to Astro', async () => {
		const [image] = await images('![A cat|300](./a.png)');
		expect(image).toMatchObject({ alt: 'A cat', width: 300, priority: true });
		expect(image.sizes).toBeUndefined();
	});
});
