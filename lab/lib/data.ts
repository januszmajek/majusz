// Stand-in data for the design lab. This is the lab's own shape, not the
// S-01 content schema. Everything under lab/content/ is local-only.
import type { MarkdownInstance } from 'astro';

export interface Article {
	slug: string;
	title: string;
	date: Date;
	summary: string;
	tags: string[];
	readingMinutes: number;
	/** Rendered body; missing for list-only entries and the empty placeholder. */
	Content?: MarkdownInstance<Record<string, unknown>>['Content'];
}

/** What every variant's Home, Article and About receive. */
export interface HomeProps {
	articles: Article[];
}
export interface ArticleProps {
	article: Article;
}

// Also reads Obsidian Web Clipper properties (published, created, description).
interface Frontmatter {
	title?: string;
	date?: string | Date;
	published?: string | Date | null;
	created?: string | Date;
	summary?: string;
	description?: string;
	tags?: string[];
}

type ListEntry = Omit<Article, 'Content' | 'slug'> & { slug?: string };

const markdown = import.meta.glob<MarkdownInstance<Frontmatter>>('../content/*.md', {
	eager: true,
});
const lists = import.meta.glob<{ entries: ListEntry[] }>('../content/list.ts', { eager: true });

const WORDS_PER_MINUTE = 220;

function slugOf(path: string): string {
	return path.split('/').pop()!.replace(/\.md$/, '');
}

/** The author-supplied stand-in articles, newest first. */
export const standIns: Article[] = Object.entries(markdown)
	.map(([path, md]) => {
		const fm = md.frontmatter;
		const words = md.rawContent().split(/\s+/).filter(Boolean).length;
		return {
			slug: slugOf(path),
			title: fm.title ?? slugOf(path),
			date: new Date(fm.date ?? fm.published ?? fm.created ?? 0),
			summary: fm.summary ?? fm.description ?? '',
			tags: fm.tags ?? [],
			readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
			Content: md.Content,
		};
	})
	.sort(byNewest);

const listEntries: Article[] = Object.values(lists)
	.flatMap((m) => m.entries)
	.map((e, i) => ({ ...e, slug: e.slug ?? `list-${i}` }));

function byNewest(a: Article, b: Article): number {
	return b.date.getTime() - a.date.getTime();
}

/** Link target for a list entry; list-only entries have no page. */
export function articleHref(article: Article): string {
	return article.Content ? `article-${article.slug}` : '#';
}

/** Shown on the article page until stand-ins are dropped into lab/content/. */
export const missingArticle: Article = {
	slug: 'missing',
	title: 'No stand-in article yet',
	date: new Date(),
	summary: '',
	tags: [],
	readingMinutes: 1,
};

/** Articles for each home state: 0, 2 or 12 entries. */
export function homeArticles(count: 0 | 2 | 12): Article[] {
	if (count === 0) return [];
	return [...standIns, ...listEntries].slice(0, count).sort(byNewest);
}

export const homeStates = [0, 2, 12] as const;

/** Every page a variant renders, keyed by its URL segment. */
export type LabPage =
	| { id: `home-${0 | 2 | 12}`; kind: 'home'; count: 0 | 2 | 12 }
	| { id: `article-${string}`; kind: 'article'; article: Article }
	| { id: 'about'; kind: 'about' };

export function labPages(): LabPage[] {
	const articles = standIns.length ? standIns : [missingArticle];
	return [
		...homeStates.map((count) => ({ id: `home-${count}` as const, kind: 'home' as const, count })),
		...articles.map((article) => ({
			id: `article-${article.slug}` as const,
			kind: 'article' as const,
			article,
		})),
		{ id: 'about', kind: 'about' },
	];
}

// ?url keeps the harness from pulling variant code (and styles) into its page.
const variantModules = import.meta.glob('../variants/*/Home.astro', { query: '?url' });

/** Variant folder names, Baseline first, the rest alphabetical. */
/** A lab-only switch a variant reads from the query, shown as a harness pill. */
export type VariantOption = {
	label: string;
	/** Show the switch only on these pages. */
	pages?: 'article';
} & (
	| {
			/** The first value is the variant's default. */
			values: string[];
		}
	| {
			/** A slider instead of pills. It updates the variant live, as `data-<key>` on its <html>. */
			range: { min: number; max: number; step: number; value: number };
		}
);

const optionModules = import.meta.glob<{ default: Record<string, VariantOption> }>(
	'../variants/*/options.ts',
	{ eager: true },
);

/** Optional `lab/variants/<name>/options.ts`, keyed by query param. */
export function variantOptions(name: string): Record<string, VariantOption> {
	return optionModules[`../variants/${name}/options.ts`]?.default ?? {};
}

export function variantNames(): string[] {
	return Object.keys(variantModules)
		.map((path) => path.split('/').at(-2)!)
		.sort((a, b) => (a === 'baseline' ? -1 : b === 'baseline' ? 1 : a.localeCompare(b)));
}
