// Main navigation, in order. Only destinations live on the site: About (S-06)
// is the one entry. Home has no entry: the wordmark links to `/`, and the home
// page is the article list.
export interface NavItem {
	id: string;
	label: string;
	href: string;
}

export const nav: NavItem[] = [{ id: 'about', label: 'about', href: '/about' }];
