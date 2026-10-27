// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Iosevka for chrome, headings and code; Iosevka Aile for long reading
// (context/foundation/design.md). Downloaded at build time, served from majusz.com.
const iosevka = (/** @type {string} */ name, /** @type {string} */ cssVariable, /** @type {string[]} */ fallbacks) => ({
  provider: fontProviders.fontsource(),
  name,
  cssVariable,
  weights: [400, 500, 600, 700],
  styles: /** @type {const} */ (['normal', 'italic']),
  subsets: ['latin'],
  fallbacks,
});

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  fonts: [
    iosevka('Iosevka', '--font-iosevka', ['ui-monospace', 'monospace']),
    iosevka('Iosevka Aile', '--font-iosevka-aile', ['ui-sans-serif', 'system-ui', 'sans-serif']),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});
