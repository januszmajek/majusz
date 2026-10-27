/** `2026-09-28`: the date format of article meta and the home list (UTC, like frontmatter dates). */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
