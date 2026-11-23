// Main navigation, in order. Only destinations live on the site: S-06 adds
// About by adding an entry here. Home has no entry: the wordmark links to `/`,
// and the home page is the article list.
export interface NavItem {
	id: string;
	label: string;
	href: string;
}

export const nav: NavItem[] = [];
