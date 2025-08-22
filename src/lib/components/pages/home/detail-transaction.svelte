<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { t } from '$lib/i18n';
	import { API_BASE_URL } from '$lib/types/api';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import CheckIcon from 'lucide-svelte/icons/check';
	import ChevronsUpDownIcon from 'lucide-svelte/icons/chevrons-up-down';
	import { cn } from '$lib/utils';
	import type {
		Transaction,
		GetTransactionsResponse,
		Category,
		GetCategoriesResponse
	} from '$lib/types/transaction';
	import TransactionList from '$lib/components/ui/transaction-list/transaction-list.svelte';

	let transactions: Transaction[] = [];
	let categories: Category[] = [];
	let isLoading = false;
	let error: string | null = null;
	let selectedType: 'all' | 'income' | 'expense' = 'all';
	let selectedPeriod: 'none' | 'month' | 'year' = 'none';
	let selectedCategory = '';
	let currentPage = 1;
	let totalPages = 1;
	let totalData = 0;
	let itemsPerPage = 10;
	let isInitialLoad = true;

	let open = false;
	let triggerRef: HTMLButtonElement | null = null;

	const paginationOptions = [5, 10, 20, 50, 100];

	$: selectedCategoryName = categories.find((c) => c.name === selectedCategory)?.name || '';

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef?.focus();
		});
	}

	async function fetchTransactions() {
		try {
			isLoading = true;
			error = null;

			const params = new SvelteURLSearchParams();

			if (selectedType !== 'all') {
				params.append('type', selectedType);
			}

			const dateFilter = getDateFilter();
			if (dateFilter) {
				params.append('date', dateFilter);
			}

			if (selectedCategory) {
				params.append('category', selectedCategory);
			}

			params.append('page', currentPage.toString());
			params.append('limit', itemsPerPage.toString());

			const url = `${API_BASE_URL}/v1/transactions${params.toString() ? '?' + params.toString() : ''}`;

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: GetTransactionsResponse = await response.json();

			if (data.data) {
				transactions = data.data.transactions;
				totalData = data.data.total_data;
				totalPages = data.data.total_page;
			} else {
				transactions = [];
				totalData = 0;
				totalPages = 1;
			}
		} catch (err) {
			console.error('Error fetching transactions:', err);
			error = 'Failed to load transactions';
			transactions = [];
			totalData = 0;
			totalPages = 1;
		} finally {
			isLoading = false;
			isInitialLoad = false;
		}
	}

	function getDateFilter(): string | undefined {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;

		switch (selectedPeriod) {
			case 'month':
				return `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
			case 'year':
				return currentYear.toString();
			default:
				return undefined;
		}
	}

	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
			fetchTransactions();
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
			fetchTransactions();
		}
	}

	function resetFilters() {
		selectedType = 'all';
		selectedPeriod = 'none';
		selectedCategory = '';
		currentPage = 1;
		itemsPerPage = 10;
		transactions = [];
		fetchTransactions();
	}

	function selectType(type: 'all' | 'income' | 'expense') {
		selectedType = type;
		if (!isInitialLoad) {
			currentPage = 1;
			fetchTransactions();
		}
	}

	function selectPeriod(period: 'none' | 'month' | 'year') {
		selectedPeriod = period;
		if (!isInitialLoad) {
			currentPage = 1;
			fetchTransactions();
		}
	}

	function changeItemsPerPage(newLimit: number) {
		itemsPerPage = newLimit;
		currentPage = 1;
		fetchTransactions();
	}

	async function fetchCategories() {
		try {
			const response = await fetch(`${API_BASE_URL}/v1/categories?active=true`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: GetCategoriesResponse = await response.json();

			if (data.data) {
				categories = data.data.categories;
			} else {
				categories = [];
			}
		} catch (err) {
			console.error('Error fetching categories:', err);
			categories = [];
		}
	}

	onMount(() => {
		fetchCategories();
		fetchTransactions();
	});
</script>

<Card class="w-full max-w-none overflow-hidden">
	<CardContent class="space-y-6 p-3 sm:p-6">
		<!-- Filters -->
		<div class="space-y-4">
			<!-- Type Filter -->
			<div class="space-y-2">
				<p class="text-sm font-medium">{$t('common.filters.type')}</p>
				<div class="flex flex-wrap gap-2">
					<Badge
						variant={selectedType === 'all' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {selectedType ===
						'all'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectType('all')}
					>
						{$t('common.all')}
					</Badge>
					<Badge
						variant={selectedType === 'income' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {selectedType ===
						'income'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectType('income')}
					>
						{$t('common.income')}
					</Badge>
					<Badge
						variant={selectedType === 'expense' ? 'destructive' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors {selectedType === 'expense'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectType('expense')}
					>
						{$t('common.expense')}
					</Badge>
				</div>
			</div>

			<!-- Period Filter -->
			<div class="space-y-2">
				<p class="text-sm font-medium">{$t('common.filters.period')}</p>
				<div class="flex flex-wrap gap-2">
					<Badge
						variant={selectedPeriod === 'none' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {selectedPeriod ===
						'none'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectPeriod('none')}
					>
						{$t('common.none')}
					</Badge>
					<Badge
						variant={selectedPeriod === 'month' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {selectedPeriod ===
						'month'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectPeriod('month')}
					>
						{$t('common.month')}
					</Badge>
					<Badge
						variant={selectedPeriod === 'year' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {selectedPeriod ===
						'year'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectPeriod('year')}
					>
						{$t('common.year')}
					</Badge>
				</div>
			</div>

			<!-- Category Filter -->
			<div class="space-y-2">
				<p class="text-sm font-medium">{$t('common.filters.category')}</p>
				<Popover.Root bind:open>
					<Popover.Trigger bind:ref={triggerRef}>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between sm:w-[200px]"
								{...props}
								role="combobox"
								aria-expanded={open}
							>
								{selectedCategoryName || $t('common.filters.select_category')}
								<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-full p-0 sm:w-[200px]">
						<Command.Root>
							<Command.Input placeholder={$t('common.filters.search_category')} />
							<Command.List>
								<Command.Empty>{$t('common.filters.no_category_found')}</Command.Empty>
								<Command.Group>
									<Command.Item
										value=""
										onSelect={() => {
											selectedCategory = '';
											if (!isInitialLoad) {
												currentPage = 1;
												fetchTransactions();
											}
											closeAndFocusTrigger();
										}}
									>
										<CheckIcon
											class={cn('mr-2 size-4', selectedCategory !== '' && 'text-transparent')}
										/>
										{$t('common.all')}
									</Command.Item>
									{#each categories as category (category.id)}
										<Command.Item
											value={category.name}
											onSelect={() => {
												selectedCategory = category.name;
												if (!isInitialLoad) {
													currentPage = 1;
													fetchTransactions();
												}
												closeAndFocusTrigger();
											}}
										>
											<CheckIcon
												class={cn(
													'mr-2 size-4',
													selectedCategory !== category.name && 'text-transparent'
												)}
											/>
											{category.name}
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>

			<!-- Items Per Page -->
			<div class="space-y-2">
				<label for="items-per-page" class="text-sm font-medium"
					>{$t('common.filters.items_per_page')}</label
				>
				<select
					id="items-per-page"
					bind:value={itemsPerPage}
					on:change={() => changeItemsPerPage(itemsPerPage)}
					class="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each paginationOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<!-- Reset Button -->
			<div class="flex justify-start">
				<Button variant="outline" onclick={resetFilters} size="sm">
					{$t('common.filters.reset')}
				</Button>
			</div>
		</div>

		<!-- Transactions List -->
		<div class="space-y-4 sm:mx-0">
			{#if error}
				<div class="py-8 text-center">
					<p class="text-red-600 dark:text-red-400">{error}</p>
					<Button variant="outline" onclick={fetchTransactions} class="mt-4">Retry</Button>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					{totalData}
					{$t('common.filters.total_transactions')}
				</p>
				<TransactionList {transactions} {isLoading} />

				<!-- Pagination -->
				{#if totalPages > 1}
					<div
						class="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0"
					>
						<p class="text-center text-sm text-muted-foreground sm:text-left">
							Page {currentPage} of {totalPages}
						</p>
						<div class="flex justify-center gap-2 sm:justify-end">
							<Button
								variant="outline"
								size="sm"
								onclick={prevPage}
								disabled={currentPage === 1}
								class="flex-1 sm:flex-none"
							>
								{$t('common.pagination.previous')}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={nextPage}
								disabled={currentPage === totalPages}
								class="flex-1 sm:flex-none"
							>
								{$t('common.pagination.next')}
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</CardContent>
</Card>
