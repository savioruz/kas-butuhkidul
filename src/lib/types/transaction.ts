import type { Response } from './api';

export interface Transaction {
	id: string;
	amount: number;
	date: string;
	type: 'income' | 'expense';
	description: string;
	category: string;
	category_name: string;
	proof?: string;
	active: boolean;
	created_at: string;
	modified_at: string;
	created_by: string;
	modified_by: string;
}

export interface Category {
	id: string;
	name: string;
	description?: string;
	active: boolean;
	created_at: string;
	modified_at: string;
	created_by: string;
	modified_by: string;
}

export interface GetCategoriesData {
	categories: Category[];
	total_data: number;
	total_page: number;
}

export type GetCategoriesResponse = Response<GetCategoriesData>;

export interface GetTransactionsData {
	transactions: Transaction[];
	total_data: number;
	total_page: number;
}

export type GetTransactionsResponse = Response<GetTransactionsData>;

export interface TransactionFilters {
	amount?: string;
	date?: string;
	type?: 'income' | 'expense';
	description?: string;
	active?: boolean;
	created_at?: string;
	category?: string;
	page?: number;
	limit?: number;
}

export interface SummaryData {
	total_income: number;
	total_expense: number;
}

export type SummaryResponse = Response<SummaryData>;
