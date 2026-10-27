// Dark: the ASCII sky. Sparse `. · + *` glyphs drifting sideways by depth.
import type { Frame } from './frame';
import { rng } from './rng';

interface Glyph {
	x: number;
	y: number;
	ch: string;
	size: number;
	alpha: number;
	depth: number;
}

/** ~0.3 glyphs per 10,000px², seeded, for a canvas of this size. */
export function buildSky(width: number, height: number): Glyph[] {
	const random = rng(42);
	const count = Math.round(((width * height) / 10000) * 0.3);
	return Array.from({ length: count }, () => {
		const depth = 0.3 + random() * 0.7;
		return {
			x: random() * width,
			y: random() * height,
			ch: '..··+*'[Math.floor(random() * 6)],
			size: 10 + depth * 5,
			alpha: 0.25 + depth * 0.35,
			depth,
		};
	});
}

export function drawAscii({ ctx, width, time, font }: Frame, glyphs: Glyph[]) {
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	for (const g of glyphs) {
		// ~2px/s × depth: too slow to track.
		const x = (((g.x + time * 2 * g.depth) % width) + width) % width;
		ctx.globalAlpha = g.alpha;
		ctx.font = `${g.size}px ${font}`;
		ctx.fillText(g.ch, x, g.y);
	}
}
