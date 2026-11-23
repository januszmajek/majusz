import { describe, expect, it } from 'vitest';
import { newestFirst } from './articles.ts';

const item = (title: string, date: string) => ({ title, date: new Date(date) });
const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe('newestFirst', () => {
	it('puts the newest date first', () => {
		const items = [item('Old', '2025-03-01'), item('New', '2026-10-27'), item('Mid', '2026-01-15')];
		expect(titles(newestFirst(items))).toEqual(['New', 'Mid', 'Old']);
	});

	it('orders same-day articles by title A→Z', () => {
		const items = [item('Zig notes', '2026-10-27'), item('Astro tips', '2026-10-27')];
		expect(titles(newestFirst(items))).toEqual(['Astro tips', 'Zig notes']);
	});

	it('ignores case in the title order', () => {
		const items = [item('Bun', '2026-10-27'), item('astro', '2026-10-27'), item('Cargo', '2026-10-27')];
		expect(titles(newestFirst(items))).toEqual(['astro', 'Bun', 'Cargo']);
	});

	it('lists a future date first', () => {
		const items = [item('Today', new Date().toISOString().slice(0, 10)), item('Later', '2999-01-01')];
		expect(titles(newestFirst(items))).toEqual(['Later', 'Today']);
	});

	it('does not mutate its input', () => {
		const items = [item('Old', '2025-03-01'), item('New', '2026-10-27')];
		newestFirst(items);
		expect(titles(items)).toEqual(['Old', 'New']);
	});

	it('returns an empty list for no articles', () => {
		expect(newestFirst([])).toEqual([]);
	});
});
