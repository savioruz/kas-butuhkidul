const baseUrl = import.meta.env.VITE_BASE_URL || '/';
const domainTrimmed = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
const domain = `https://${domainTrimmed}`;

export interface NavItem {
	href: string;
	label: string;
	translationKey: string;
}

export const navigationConfig: NavItem[] = [
	{
		href: domain,
		label: 'Home',
		translationKey: 'home'
	},
	{
		href: `${domain}/histories`,
		label: 'Histories',
		translationKey: 'histories'
	},
	{
		href: `${domain}/articles`,
		label: 'Articles',
		translationKey: 'articles'
	},
	{
		href: `${domain}/organizations`,
		label: 'Organizations',
		translationKey: 'organizations'
	},
	{
		href: 'https://kas.butuhkidul.my.id/',
		label: 'Financial',
		translationKey: 'financial'
	}
];
