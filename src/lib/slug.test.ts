import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadArticleIndex } from './markdown/article-index.ts';
import { articleId, toSlug } from './slug.ts';

describe('articleId', () => {
	it('uses the slug property, coerced as YAML reads `slug: 2026` as a number', () => {
		expect(articleId({ slug: 2026, title: 'Ignored' })).toBe('2026');
	});

	it('falls back to the slugified title', () => {
		expect(articleId({ title: 'Zażółć gęślą jaźń' })).toBe('zazolc-gesla-jazn');
	});

	it('is undefined without a usable title', () => {
		expect(articleId({})).toBeUndefined();
		expect(articleId({ title: 42 })).toBeUndefined();
		expect(articleId({ title: '!!!' })).toBeUndefined();
	});
});

describe('loadArticleIndex', () => {
	it('maps lowercase file names to the same id the collection uses', () => {
		const dir = mkdtempSync(join(tmpdir(), 'articles-'));
		writeFileSync(join(dir, 'Year Note.md'), '---\ntitle: Year\nslug: 2026\n---\nBody');
		writeFileSync(join(dir, 'Zażółć.md'), '---\ntitle: Zażółć gęślą jaźń\n---\nBody');
		writeFileSync(join(dir, 'Bom.md'), '\uFEFF---\ntitle: With BOM\n---\nBody');
		writeFileSync(join(dir, 'Blank.md'), '\n---\r\ntitle: Blank line first\r\n--- \r\nBody');
		writeFileSync(join(dir, 'Broken.md'), '---\ntitle: [unclosed\n---\nBody');
		writeFileSync(join(dir, 'No frontmatter.md'), 'Body');
		writeFileSync(join(dir, 'notes.txt'), 'not an article');
		writeFileSync(join(dir, '.hidden.md'), '---\ntitle: Hidden\n---\nBody');
		mkdirSync(join(dir, 'folder.md'));

		const index = loadArticleIndex(pathToFileURL(`${dir}/`));

		expect(Object.fromEntries(index)).toEqual({
			'year note': articleId({ slug: 2026 }),
			bom: 'with-bom',
			blank: 'blank-line-first',
			'zażółć': toSlug('Zażółć gęślą jaźń'),
		});
	});
});
