// Ten made-up list entries for the lab's 12-article home state.
const entry = (title: string, date: string, summary: string, tags: string[], readingMinutes: number) => ({
	title,
	date: new Date(date),
	summary,
	tags,
	readingMinutes,
});

export const entries = [
	entry('What a week of pairing with coding agents taught me', '2026-09-28', 'Where the agent saved hours, where it cost them, and the review habit that made the difference.', ['ai', 'tooling'], 9),
	entry('Building a starfield that doesn’t eat your battery', '2026-09-12', 'Canvas, requestAnimationFrame and the visibility API: a slow night sky on a phone budget.', ['web', 'performance'], 7),
	entry('Notes from my first Cloudflare Workers deploy', '2026-08-30', 'Static assets, a GitHub Action and one rollback drill before anything went live.', ['devops'], 5),
	entry('Why I publish from Obsidian', '2026-08-14', 'One folder, plain markdown, and a site that turns a note into an article without a CMS.', ['writing', 'obsidian'], 4),
	entry('The game I keep not finishing', '2026-07-27', 'Three prototypes, one engine switch and what scope creep looks like from the inside.', ['games'], 11),
	entry('Reading the Voyager golden record as a design brief', '2026-07-09', 'A message for an audience you will never meet is a surprisingly good UX exercise.', ['space', 'design'], 8),
	entry('TypeScript strict mode, one year later', '2026-06-21', 'The errors that annoyed me most turned out to be the ones that caught real bugs.', ['typescript'], 6),
	entry('A tiny CLI for my morning routine', '2026-06-02', 'Calendar, weather and the three things I said I would do, printed in the terminal.', ['tooling'], 3),
	entry('Learning to write by explaining things to myself', '2026-05-18', 'Journaling didn’t make me think clearly. Writing for a reader did.', ['writing'], 5),
	entry('How far away is the nearest star, really?', '2026-04-30', 'Light-years, parsecs and why every scale model of space is a lie.', ['space'], 6),
];
