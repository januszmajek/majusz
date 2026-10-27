// Main navigation, in order. Only destinations live on the site: S-06 adds
// About by adding an entry here.
export interface NavItem {
	id: string;
	label: string;
	href: string;
}

export const nav: NavItem[] = [{ id: 'articles', label: 'articles', href: '/' }];
