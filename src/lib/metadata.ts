export const siteConfig = {
	name: 'Butuh Kidul',
	logo: '/favicon.svg',
	description:
		'Kas Butuh Kidul is a personal finance management app designed to help you track your income and expenses effectively.',
	keywords: 'finance, income, expenses, budgeting',
	url: new URL('https://kas.butuhkidul.my.id'),
	ogImage: new URL('https://kas.butuhkidul.my.id/og.png'),
	links: {
		twitter: new URL('https://twitter.com/butuhkidul'),
		github: new URL('https://github.com/savioruz/kas-butuhkidul')
	},
	googleVerification: '@TODO - Replace with your Google verification code',
	yandexVerification: '@TODO - Replace with your Yandex verification code',
	home: 'https://butuhkidul.my.id'
} as const;

export type SiteConfig = typeof siteConfig;
