const baseUrl = import.meta.env.VITE_BASE_URL || '/';
const domainTrimmed = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

export interface NavItem {
	href: string;
	label: string;
	translationKey: string;
}

export const navigationConfig: NavItem[] = [
	{
		href: `https://dash.${domainTrimmed}`,
		label: 'Dashboard',
		translationKey: 'dashboard'
	}
];
