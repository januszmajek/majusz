// Every external URL the site shows. Socials list only the profiles the author
// actively uses (PRD FR-005), in display order; `repo` is the site's public
// source (FR-006), linked from About and the footer.
export interface ExternalLink {
	readonly label: string;
	readonly href: string;
}

export interface Social extends ExternalLink {
	readonly id: 'github' | 'linkedin' | 'x';
}

export const socials: readonly Social[] = [
	{ id: 'github', label: 'GitHub', href: 'https://github.com/januszmajek' },
	{ id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/janusz-majek/' },
	{ id: 'x', label: 'X (@janusz_majek)', href: 'https://x.com/janusz_majek' },
];

export const repo: ExternalLink = {
	label: 'source of this site',
	href: 'https://github.com/januszmajek/majusz',
};
