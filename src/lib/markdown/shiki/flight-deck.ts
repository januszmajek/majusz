// Flight deck code themes for Shiki (context/foundation/design.md → Code), one per site theme.
// Few colors on purpose: body text for code, muted for comments and punctuation, the theme's
// accent for keywords, and three quiet hues for strings, constants and types. Every color clears
// 4.5:1 on that theme's --card, which src/lib/markdown/shiki/contrast.test.ts checks.
// Shiki emits them as `--shiki-light` / `--shiki-dark` variables (`defaultColor: false` in
// astro.config.mjs); src/styles/prose.css picks one by the `.dark` class.
import type { ShikiConfig } from 'astro';

type Theme = Extract<NonNullable<ShikiConfig['themes']>[string], { name?: string }>;
type Palette = { foreground: string; muted: string; keyword: string; string: string; constant: string; type: string };

const theme = (name: string, type: 'light' | 'dark', p: Palette): Theme => ({
	name,
	type,
	// The `pre` keeps --card from prose.css; this only feeds Shiki's own variables.
	colors: { 'editor.background': type === 'light' ? '#eef0f3' : '#111511', 'editor.foreground': p.foreground },
	tokenColors: [
		{ settings: { foreground: p.foreground } },
		{ scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: p.muted, fontStyle: 'italic' } },
		{ scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: p.muted } },
		{
			scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'entity.name.tag', 'keyword.control'],
			settings: { foreground: p.keyword },
		},
		{ scope: ['string', 'string.template', 'markup.inline.raw', 'constant.other.symbol'], settings: { foreground: p.string } },
		{
			scope: [
				'constant',
				'constant.numeric',
				'constant.language',
				'constant.character',
				'support.constant',
				'variable.other.constant',
				'entity.other.attribute-name',
				'support.type.property-name',
			],
			settings: { foreground: p.constant },
		},
		{
			scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'],
			settings: { foreground: p.type },
		},
		{ scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: p.foreground } },
		{ scope: ['markup.heading', 'markup.bold'], settings: { fontStyle: 'bold' } },
		{ scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
		{ scope: ['markup.deleted'], settings: { foreground: p.keyword } },
		{ scope: ['markup.inserted'], settings: { foreground: p.string } },
	],
});

/** Cleanroom: International Orange keywords on the light code background. */
export const flightDeckLight = theme('flight-deck-light', 'light', {
	foreground: '#0b0e11',
	muted: '#5d636b',
	keyword: '#c63a00',
	string: '#2e6b3c',
	constant: '#2b5aa8',
	type: '#7a4a9e',
});

/** Flight deck: phosphor-green keywords, lifted from the link green to read on --card. */
export const flightDeckDark = theme('flight-deck-dark', 'dark', {
	foreground: '#d6e2d6',
	muted: '#8b9a8d',
	keyword: '#5cc27a',
	string: '#d8a657',
	constant: '#7fb3e0',
	type: '#c49be0',
});
