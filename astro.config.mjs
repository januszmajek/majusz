// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';

import { readingTime } from './src/lib/markdown/reading-time.ts';
import { obsidianGuard } from './src/lib/markdown/obsidian-guard.ts';
import { imageWidth } from './src/lib/markdown/image-width.ts';

// Iosevka for chrome, headings and code; Iosevka Aile for long reading
// (context/foundation/design.md). Subset copies in src/assets/fonts/ (made by
// scripts/subset-fonts.mjs), served from majusz.com.
const iosevka = (/** @type {string} */ file, /** @type {string} */ name, /** @type {string} */ cssVariable, /** @type {string[]} */ fallbacks) => ({
  provider: fontProviders.local(),
  name,
  cssVariable,
  fallbacks,
  options: {
    variants: /** @type {const} */ ([400, 500, 600, 700]).flatMap((weight) =>
      /** @type {const} */ (['normal', 'italic']).map((style) => ({
        src: /** @type {[string]} */ ([`./src/assets/fonts/${file}-${weight}-${style}.woff2`]),
        weight,
        style,
      })),
    ),
  },
});

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // An article slug that clashes with a static page (e.g. `slug: 404`) fails the build
  // instead of the article being silently hidden.
  prerenderConflictBehavior: 'error',

  // Markdown images get webp, a srcset, width/height and lazy loading.
  image: { layout: 'constrained', responsiveStyles: true },

  // Sätteri, Astro's default processor, with the in-repo plugins: reading time for the meta
  // line, a guard that fails the build on raw Obsidian syntax, and Obsidian's `|300` image
  // width. `features.wikilinks` stays off, so `[[x]]` reaches the guard instead of becoming
  // a broken link.
  markdown: { processor: satteri({ mdastPlugins: [readingTime, obsidianGuard], hastPlugins: [imageWidth] }) },

  fonts: [
    iosevka('iosevka', 'Iosevka', '--font-iosevka', ['ui-monospace', 'monospace']),
    iosevka('iosevka-aile', 'Iosevka Aile', '--font-iosevka-aile', ['ui-sans-serif', 'system-ui', 'sans-serif']),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
