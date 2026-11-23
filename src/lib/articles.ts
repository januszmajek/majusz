const byTitle = new Intl.Collator('en', { sensitivity: 'base' });

/**
 * The home list order: newest `date` first, then title A→Z (ignoring case) for the same
 * day, so it never depends on file names or loader order. Returns a new array.
 */
export const newestFirst = <T extends { title: string; date: Date }>(items: readonly T[]): T[] =>
	[...items].sort((a, b) => b.date.getTime() - a.date.getTime() || byTitle.compare(a.title, b.title));
