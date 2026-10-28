// Articles are the Obsidian notes in content/articles/ (one flat folder). The id, and so
// the URL, is the note's `slug` property or else its slugified title, never the file name.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { toSlug } from '@/lib/slug';

const articles = defineCollection({
	loader: glob({
		base: './content/articles',
		pattern: '*.md',
		// Rendering at build time (not at sync) makes a throwing markdown plugin fail the build.
		deferRender: true,
		generateId: ({ entry, data }) => {
			if (data.slug != null) return String(data.slug);
			// No title: return anything, the schema then fails naming the file.
			if (typeof data.title !== 'string') return entry;
			const slug = toSlug(data.title);
			if (!slug) throw new Error(`content/articles/${entry}: title "${data.title}" has no letters or digits for a URL; add a \`slug\` property`);
			return slug;
		},
	}),
	schema: z.object({
		title: z.string().trim().min(1),
		date: z.coerce.date(),
		summary: z.string().trim().min(1),
		tags: z.array(z.string()).default([]),
		// Coerced, since YAML reads `slug: 2026` as a number.
		slug: z.coerce.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
	}),
});

export const collections = { articles };
