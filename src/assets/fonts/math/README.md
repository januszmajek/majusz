# Latin Modern Math

`latinmodern-math.woff2` is Latin Modern Math 1.959 (GUST e-foundry, 2014) under the GUST Font
License (`GUST-FONT-LICENSE.txt`). Source: `opentype/latinmodern-math.otf` in
<https://mirrors.ctan.org/fonts/lm-math.zip> (sha256
`6075562b771f8b82f0c179e363389684f2dd09de30038269e2628e504bd7be0f`), converted whole, MATH table
kept, with `woff2_compress latinmodern-math.otf`.

Never served whole in production: `src/integrations/math-font.ts` serves it only in dev and cuts
it at build time to the glyphs the built pages' formulas use. Don't import it through Vite or put
it in `public/`.
