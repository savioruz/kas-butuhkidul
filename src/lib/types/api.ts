export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface Response<T> {
	data?: T;
	paging?: {
		page: number;
		limit: number;
		total_page: number;
		total_count: number;
	};
}

export interface ErrorResponse {
	errors: {
		[key: string]: string[];
	};
}
