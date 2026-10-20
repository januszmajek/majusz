// @ts-check
// Design lab: a separate dev app over lab/, reusing the site's config.
// Run with `npm run lab`; it is never built or deployed.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
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
});
