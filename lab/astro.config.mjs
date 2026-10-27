// @ts-check
// Design lab: a separate dev app over lab/, reusing the site's config.
// Run with `npm run lab`; it is never built or deployed.
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import site from '../astro.config.mjs';

export default defineConfig({
  ...site,
  root: fileURLToPath(new URL('..', import.meta.url)),
  srcDir: './lab',
  outDir: './lab/dist',
  cacheDir: './lab/.astro',
  server: { ...site.server, port: 4322 },
  // The toolbar would sit under the picker, in the harness and in every frame.
  devToolbar: { enabled: false },
  // The site's fonts plus candidates only variants use, self-hosted from Fontsource.
  fonts: [
    ...(site.fonts ?? []),
    ...[['Iosevka Etoile', '--font-iosevka-etoile']].map(([name, cssVariable]) => ({
      provider: fontProviders.fontsource(),
      name,
      cssVariable,
      weights: [400, 500, 600, 700],
      styles: /** @type {const} */ (['normal', 'italic']),
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    })),
  ],
});
