// Lifecycle of the motif canvas: picks the sky from `.dark` on <html>, sizes
// it to the device pixel ratio (capped at 2), runs it on requestAnimationFrame,
// pauses when the tab is hidden, stays still under reduced motion.
import { buildSky, drawAscii } from './ascii';
import type { Frame } from './frame';
import { drawGraticule } from './graticule';
import { orbit } from './orbit';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const FRAME_MS = 1000 / 30;

export function startMotif(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	const html = document.documentElement;
	const satAt = orbit(7);
	const frame: Frame = { ctx, width: 0, height: 0, time: 0, font: 'monospace' };

	let night = html.classList.contains('dark');
	let color = '#000';
	let glyphs = buildSky(0, 0);
	let raf = 0;
	let last = 0;

	const readStyle = () => {
		night = html.classList.contains('dark');
		color = getComputedStyle(canvas).getPropertyValue('--motif').trim() || '#000';
		frame.font = getComputedStyle(html).fontFamily || 'monospace';
	};

	const draw = () => {
		ctx.clearRect(0, 0, frame.width, frame.height);
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		if (night) drawAscii(frame, glyphs);
		else drawGraticule(frame, satAt);
		ctx.globalAlpha = 1;
	};

	const resize = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		frame.width = canvas.clientWidth;
		frame.height = canvas.clientHeight;
		if (!frame.width || !frame.height) return;
		canvas.width = Math.round(frame.width * dpr);
		canvas.height = Math.round(frame.height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		glyphs = buildSky(frame.width, frame.height);
		draw();
	};

	// Motion is 0.7–2px/s, so 30 redraws a second look the same as 120 and
	// cost a phone far less.
	let drawn = 0;
	const tick = (now: number) => {
		if (last) frame.time += (now - last) / 1000;
		last = now;
		if (now - drawn >= FRAME_MS) {
			drawn = now;
			draw();
		}
		raf = requestAnimationFrame(tick);
	};

	const update = () => {
		cancelAnimationFrame(raf);
		last = 0;
		if (frame.width && !document.hidden && !reducedMotion.matches) raf = requestAnimationFrame(tick);
	};

	readStyle();
	resize();
	update();

	new ResizeObserver(() => {
		resize();
		update();
	}).observe(canvas);
	// The theme changes by `.dark` on <html>: switch sky and ink.
	new MutationObserver(() => {
		readStyle();
		draw();
	}).observe(html, { attributes: true, attributeFilter: ['class'] });
	document.addEventListener('visibilitychange', update);
	reducedMotion.addEventListener('change', update);
}
