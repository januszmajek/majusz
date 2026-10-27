// Light: the graticule. A flat lat/lon grid in dotted hairlines, 20° per 200px,
// centered on the satellite's longitude; degree labels on the outer edges and
// its telemetry in the bottom-right margin corner.
import { margin, type Frame } from './frame';
import { latLabel, lonLabel, readout, type Sat } from './orbit';

const STEP = 20; // degrees between grid lines
const PX = 200 / STEP; // px per degree
const ALPHA = { line: 0.15, label: 0.25, readout: 0.32 };
/** Readouts change in steps this long, so digits never tick visibly. */
const READOUT_STEP_S = 5;

export function drawGraticule({ ctx, width, height, time, font }: Frame, satAt: (t: number) => Sat) {
	const sat = satAt(time);
	const cx = width / 2;
	const cy = height / 2;
	// Meridians pan at ~0.7px/s: unrounded, so they glide instead of
	// jumping a whole pixel every second or two. Parallels stay crisp.
	const x = (lon: number) => cx + (lon - sat.lon) * PX;
	const y = (lat: number) => Math.round(cy - lat * PX) + 0.5;
	const lonMin = Math.floor((sat.lon - cx / PX) / STEP) * STEP;
	const lonMax = sat.lon + cx / PX + STEP;
	const latMax = Math.min(90, Math.floor(cy / PX / STEP) * STEP + STEP);

	ctx.lineWidth = 1;
	ctx.setLineDash([1, 4]);
	ctx.globalAlpha = ALPHA.line;
	ctx.beginPath();
	for (let lon = lonMin; lon <= lonMax; lon += STEP) {
		ctx.moveTo(x(lon), Math.max(0, y(90)));
		ctx.lineTo(x(lon), Math.min(height, y(-90)));
	}
	for (let lat = -latMax; lat <= latMax; lat += STEP) {
		ctx.moveTo(0, y(lat));
		ctx.lineTo(width, y(lat));
	}
	ctx.stroke();
	ctx.setLineDash([]);

	const m = margin(width);
	if (m < 150) return;
	// Degree labels on the outer edges: latitudes down the left, longitudes
	// along the bottom, fading out before they reach the column.
	ctx.font = `10px ${font}`;
	ctx.textBaseline = 'bottom';
	ctx.textAlign = 'left';
	ctx.globalAlpha = ALPHA.label;
	// Labels and telemetry knock the grid out behind them, as on a printed chart.
	const knockout = (kx: number, ky: number, kw: number, kh: number) => ctx.clearRect(kx - 4, ky - 3, kw + 8, kh + 6);
	for (let lat = -latMax; lat <= latMax; lat += STEP) {
		const ly = y(lat) - 4;
		if (ly > 24 && ly < height - 28) ctx.fillText(latLabel(lat), 16, ly);
	}
	const left = m - 24;
	const right = width - m + 24;
	for (let lon = lonMin; lon <= lonMax; lon += STEP) {
		const text = lonLabel(lon);
		const lx = x(lon) + 4;
		const tw = ctx.measureText(text).width;
		const room = Math.max(left - (lx + tw), lx - right, -1);
		const fade = Math.min(1, room / 48) * Math.min(1, (lx - 56) / 48);
		if (fade <= 0) continue;
		knockout(lx, height - 22, tw, 10);
		ctx.globalAlpha = ALPHA.label * fade;
		ctx.fillText(text, lx, height - 12);
	}
	// Telemetry in the bottom-right corner, above the edge labels: its
	// longest line ends 16px from the edge, mirroring the latitude labels.
	if (m < 180) return;
	const lines = readout(satAt(Math.floor(time / READOUT_STEP_S) * READOUT_STEP_S));
	ctx.font = `11px ${font}`;
	ctx.textBaseline = 'alphabetic';
	const block = Math.max(...lines.map((l) => ctx.measureText(l).width));
	const bx = Math.round(width - 16 - block);
	const by = height - 40;
	knockout(bx, by - (lines.length - 1) * 16 - 9, block, (lines.length - 1) * 16 + 12);
	ctx.globalAlpha = ALPHA.readout;
	lines.forEach((line, i) => ctx.fillText(line, bx, by - (lines.length - 1 - i) * 16));
}
