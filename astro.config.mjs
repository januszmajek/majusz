// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

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

  fonts: [
    iosevka('iosevka', 'Iosevka', '--font-iosevka', ['ui-monospace', 'monospace']),
    iosevka('iosevka-aile', 'Iosevka Aile', '--font-iosevka-aile', ['ui-sans-serif', 'system-ui', 'sans-serif']),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
