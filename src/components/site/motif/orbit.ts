// A virtual satellite on an ISS-like orbit (inc 51.64°, alt 408–418 km,
// period ~92.7 min), flown in real time from a seeded start.
import { rng } from './rng';

const RAD = Math.PI / 180;
const INC = 51.64 * RAD;
const PERIOD_S = 5562; // ~92.7 min
const EARTH_DEG_S = 360 / 86164;

export interface Sat {
	lat: number;
	/** Longitude, unwrapped so the grid pans without jumps (degrees). */
	lon: number;
	alt: number;
	v: number;
	/** Mission elapsed time, seconds. */
	met: number;
}

/** Position `t` seconds after start, for a satellite seeded by `seed`. */
export function orbit(seed: number) {
	const random = rng(seed);
	const u0 = random() * Math.PI * 2;
	const node0 = random() * 360 - 180;
	const met0 = (11 * 60 + 50) * 60 + Math.floor(random() * 600);

	return (t: number): Sat => {
		const u = u0 + (t / PERIOD_S) * Math.PI * 2;
		const lat = Math.asin(Math.sin(INC) * Math.sin(u)) / RAD;
		const a = Math.atan2(Math.cos(INC) * Math.sin(u), Math.cos(u));
		const along = a + Math.PI * 2 * Math.round((u - a) / (Math.PI * 2));
		const lon = node0 + along / RAD - EARTH_DEG_S * t;
		const alt = 413 + 5 * Math.sin(u + 1.1);
		return { lat, lon, alt, v: 7.66 - (alt - 413) * 0.0011, met: met0 + t };
	};
}

export const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

export const latLabel = (d: number) => (d === 0 ? '0°' : `${Math.abs(d)}°${d > 0 ? 'N' : 'S'}`);

export const lonLabel = (d: number) => {
	const w = wrap180(d);
	return w === 0 || Math.abs(w) === 180 ? `${Math.abs(w)}°` : `${Math.abs(w)}°${w > 0 ? 'E' : 'W'}`;
};

const signed = (n: number, digits: number, width: number) => n.toFixed(digits).padStart(width, ' ');

/** Telemetry lines: lat, lon, alt, v, t+. */
export function readout(s: Sat) {
	const m = Math.floor(s.met / 60);
	return [
		`lat ${signed(s.lat, 1, 6)}`,
		`lon ${signed(wrap180(s.lon), 1, 6)}`,
		`alt ${Math.round(s.alt)} km`,
		`v   ${s.v.toFixed(2)} km/s`,
		`t+${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`,
	];
}
