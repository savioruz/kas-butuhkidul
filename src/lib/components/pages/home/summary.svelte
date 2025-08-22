<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import { API_BASE_URL } from '$lib/types/api';
	import type { SummaryResponse } from '$lib/types/transaction';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';

	let isLoading = true;
	let error: string | null = null;
	let summary: SummaryResponse | null = null;

	$: balance = summary?.data ? summary.data.total_income - summary.data.total_expense : 0;

	function formatCurrency(amount: number): string {
		const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(safeAmount);
	}

	async function fetchSummary() {
		try {
			isLoading = true;
			error = null;

			const response = await fetch(`${API_BASE_URL}/v1/transactions/summary`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: SummaryResponse = await response.json();
			summary = data;
		} catch (err) {
			console.error('Error fetching summary:', err);
			error = $t('common.failed_to_load_summary');
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchSummary();
	});
</script>

<Card
	class="mx-auto w-[300px] border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg md:w-[400px] dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950"
>
	<CardContent class="p-6">
		{#if isLoading}
			<!-- Loading State -->
			<div class="space-y-6">
				<div class="text-center">
					<div class="mb-2 h-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
					<div class="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
				</div>
				<div class="space-y-4">
					<div class="animate-pulse rounded-lg bg-gray-200 p-4 dark:bg-gray-700">
						<div class="mb-2 h-4 rounded bg-gray-300 dark:bg-gray-600"></div>
						<div class="h-6 rounded bg-gray-300 dark:bg-gray-600"></div>
					</div>
					<div class="animate-pulse rounded-lg bg-gray-200 p-4 dark:bg-gray-700">
						<div class="mb-2 h-4 rounded bg-gray-300 dark:bg-gray-600"></div>
						<div class="h-6 rounded bg-gray-300 dark:bg-gray-600"></div>
					</div>
				</div>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="py-8 text-center">
				<div class="mb-2 text-sm text-red-500">⚠️</div>
				<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
				<button
					class="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
					onclick={fetchSummary}
				>
					Retry
				</button>
			</div>
		{:else}
			<!-- Summary Content -->
			<div class="space-y-6">
				<!-- Balance Section -->
				<div class="text-center">
					<h3 class="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
						{$t('common.balance')}
					</h3>
					<p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
						{formatCurrency(balance)}
					</p>
				</div>

				<!-- Income and Expense Cards -->
				<div class="space-y-4">
					<!-- Income -->
					<div
						class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950"
					>
						<p class="mb-1 text-sm font-medium text-green-700 dark:text-green-300">
							{$t('common.income')}
						</p>
						<p class="text-xl font-bold text-green-600 dark:text-green-400">
							{formatCurrency(summary?.data?.total_income || 0)}
						</p>
					</div>

					<!-- Expense -->
					<div
						class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
					>
						<p class="mb-1 text-sm font-medium text-red-700 dark:text-red-300">
							{$t('common.expense')}
						</p>
						<p class="text-xl font-bold text-red-600 dark:text-red-400">
							{formatCurrency(summary?.data?.total_expense || 0)}
						</p>
					</div>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
