/** What every painter gets for one frame. */
export interface Frame {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	/** Seconds the motif has been running (paused time excluded). */
	time: number;
	font: string;
}

/** Width of the content column: max-w-3xl. */
export const COLUMN = 768;

/** Side margin beside the content column, in px. */
export const margin = (width: number) => Math.max(0, (width - COLUMN) / 2);
