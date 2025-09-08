<script lang="ts">
	import { onMount, tick, onDestroy } from 'svelte';
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
	import ChevronLeftIcon from 'lucide-svelte/icons/chevron-left';
	import ChevronRightIcon from 'lucide-svelte/icons/chevron-right';
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
	let selectedPeriod:
		| 'none'
		| 'this_month'
		| 'last_month'
		| 'this_year'
		| 'last_year'
		| 'january'
		| 'february'
		| 'march'
		| 'april'
		| 'may'
		| 'june'
		| 'july'
		| 'august'
		| 'september'
		| 'october'
		| 'november'
		| 'december'
		| string = 'none';
	let selectedCategory = '';
	let currentPage = 1;
	let totalPages = 1;
	let totalData = 0;
	let itemsPerPage = 10;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let isInitialLoad = true;

	let open = false;
	let triggerRef: HTMLButtonElement | null = null;
	let categorySearchTerm = '';
	let isLoadingCategories = false;

	let periodOpen = false;
	let periodTriggerRef: HTMLButtonElement | null = null;

	// Track pending filter changes (not yet applied)
	let pendingType: 'all' | 'income' | 'expense' = 'all';
	let pendingPeriod: string = 'none';
	let pendingCategory = '';
	let pendingItemsPerPage = 10;

	const paginationOptions = [5, 10, 20, 50, 100];

	// Period options for the dropdown
	const periodOptions = [
		{ value: 'none', label: 'common.none' },
		{ value: 'this_month', label: 'common.this_month' },
		{ value: 'last_month', label: 'common.last_month' },
		{ value: 'this_year', label: 'common.this_year' },
		{ value: 'last_year', label: 'common.last_year' },
		{ value: 'january', label: 'common.months.january' },
		{ value: 'february', label: 'common.months.february' },
		{ value: 'march', label: 'common.months.march' },
		{ value: 'april', label: 'common.months.april' },
		{ value: 'may', label: 'common.months.may' },
		{ value: 'june', label: 'common.months.june' },
		{ value: 'july', label: 'common.months.july' },
		{ value: 'august', label: 'common.months.august' },
		{ value: 'september', label: 'common.months.september' },
		{ value: 'october', label: 'common.months.october' },
		{ value: 'november', label: 'common.months.november' },
		{ value: 'december', label: 'common.months.december' }
	] as const;

	// Generate year options starting from 2025 up to current year only
	const currentYear = new Date().getFullYear();
	const startYear = 2025;
	const endYear = currentYear; // Only show up to current year
	const yearOptions =
		endYear >= startYear
			? Array.from({ length: endYear - startYear + 1 }, (_, i) => {
					const year = startYear + i;
					return { value: year.toString(), label: year.toString() };
				})
			: []; // If current year is before 2025, show no years

	$: selectedCategoryName = categories.find((c) => c.name === pendingCategory)?.name || '';
	$: selectedPeriodLabel = (() => {
		// Check if it's a specific year
		if (pendingPeriod.match(/^\d{4}$/) && parseInt(pendingPeriod) >= 2025) {
			return pendingPeriod; // Return the year as is
		}
		// Find in period options
		const found = periodOptions.find((p) => p.value === pendingPeriod);
		return found ? found.label : 'common.none';
	})();

	// Calculate sums from current transactions
	$: totalIncome = transactions
		.filter((t) => t.type === 'income' && t.active)
		.reduce((sum, t) => sum + t.amount, 0);

	$: totalExpense = transactions
		.filter((t) => t.type === 'expense' && t.active)
		.reduce((sum, t) => sum + t.amount, 0);

	$: netBalance = totalIncome - totalExpense;

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef?.focus();
		});
	}

	function closeAndFocusPeriodTrigger() {
		periodOpen = false;
		tick().then(() => {
			periodTriggerRef?.focus();
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
			case 'this_month':
				return `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
			case 'last_month': {
				const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
				const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
				return `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}`;
			}
			case 'this_year':
				return currentYear.toString();
			case 'last_year':
				return (currentYear - 1).toString();
			case 'january':
				return `${currentYear}-01`;
			case 'february':
				return `${currentYear}-02`;
			case 'march':
				return `${currentYear}-03`;
			case 'april':
				return `${currentYear}-04`;
			case 'may':
				return `${currentYear}-05`;
			case 'june':
				return `${currentYear}-06`;
			case 'july':
				return `${currentYear}-07`;
			case 'august':
				return `${currentYear}-08`;
			case 'september':
				return `${currentYear}-09`;
			case 'october':
				return `${currentYear}-10`;
			case 'november':
				return `${currentYear}-11`;
			case 'december':
				return `${currentYear}-12`;
			default:
				// Check if it's a specific year (e.g., "2025", "2026", etc.)
				if (selectedPeriod.match(/^\d{4}$/)) {
					return selectedPeriod;
				}
				return undefined;
		}
	}

	function applyFilters() {
		selectedType = pendingType;
		selectedPeriod = pendingPeriod;
		selectedCategory = pendingCategory;
		itemsPerPage = pendingItemsPerPage;
		currentPage = 1;
		fetchTransactions();
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

		// Also reset pending filters
		pendingType = 'all';
		pendingPeriod = 'none';
		pendingCategory = '';
		pendingItemsPerPage = 10;

		transactions = [];
		fetchTransactions();
	}

	function selectType(type: 'all' | 'income' | 'expense') {
		pendingType = type;
	}

	function changePeriod(newPeriod: string) {
		pendingPeriod = newPeriod;
	}

	function changeCategory(newCategory: string) {
		pendingCategory = newCategory;
	}

	async function fetchCategories(searchTerm = '') {
		try {
			isLoadingCategories = true;
			const params = new SvelteURLSearchParams();
			params.append('active', 'true');

			if (!searchTerm.trim()) {
				params.append('limit', '25');
			} else {
				params.append('name', searchTerm.trim());
			}

			const url = `${API_BASE_URL}/v1/categories?${params.toString()}`;
			const response = await fetch(url);

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
		} finally {
			isLoadingCategories = false;
		}
	}

	// Debounced search function for category search
	let searchTimeout: number | null = null;
	function handleCategorySearch(term: string) {
		categorySearchTerm = term;

		// Clear previous timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Debounce search by 300ms
		searchTimeout = setTimeout(() => {
			fetchCategories(term);
		}, 300);
	}

	onMount(() => {
		fetchCategories();
		fetchTransactions();
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});
</script>

<Card class="w-full max-w-none overflow-hidden">
	<CardContent class="space-y-6 p-3 sm:p-6">
		<div class="space-y-4">
			<div class="space-y-2">
				<p class="text-sm font-medium">{$t('common.filters.type')}</p>
				<div class="flex flex-wrap gap-2">
					<Badge
						variant={pendingType === 'all' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {pendingType ===
						'all'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectType('all')}
					>
						{$t('common.all')}
					</Badge>
					<Badge
						variant={pendingType === 'income' ? 'default' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors hover:bg-primary/80 {pendingType ===
						'income'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectType('income')}
					>
						{$t('common.income')}
					</Badge>
					<Badge
						variant={pendingType === 'expense' ? 'destructive' : 'outline'}
						class="cursor-pointer px-3 py-1 transition-colors {pendingType === 'expense'
							? ''
							: 'hover:bg-muted'}"
						onclick={() => selectType('expense')}
					>
						{$t('common.expense')}
					</Badge>
				</div>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium">{$t('common.filters.period')}</p>
				<Popover.Root bind:open={periodOpen}>
					<Popover.Trigger bind:ref={periodTriggerRef}>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between sm:w-[200px]"
								{...props}
								role="combobox"
								aria-expanded={periodOpen}
							>
								{$t(selectedPeriodLabel)}
								<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-full p-0 sm:w-[200px]">
						<Command.Root>
							<Command.List>
								<Command.Group heading={$t('common.filters.quick_periods')}>
									<Command.Item
										value="none"
										onSelect={() => {
											changePeriod('none');
											closeAndFocusPeriodTrigger();
										}}
									>
										<CheckIcon
											class={cn('mr-2 size-4', pendingPeriod !== 'none' && 'text-transparent')}
										/>
										{$t('common.none')}
									</Command.Item>
									<Command.Item
										value="this_month"
										onSelect={() => {
											changePeriod('this_month');
											closeAndFocusPeriodTrigger();
										}}
									>
										<CheckIcon
											class={cn(
												'mr-2 size-4',
												pendingPeriod !== 'this_month' && 'text-transparent'
											)}
										/>
										{$t('common.this_month')}
									</Command.Item>
									<Command.Item
										value="last_month"
										onSelect={() => {
											changePeriod('last_month');
											closeAndFocusPeriodTrigger();
										}}
									>
										<CheckIcon
											class={cn(
												'mr-2 size-4',
												pendingPeriod !== 'last_month' && 'text-transparent'
											)}
										/>
										{$t('common.last_month')}
									</Command.Item>
									<Command.Item
										value="this_year"
										onSelect={() => {
											changePeriod('this_year');
											closeAndFocusPeriodTrigger();
										}}
									>
										<CheckIcon
											class={cn('mr-2 size-4', pendingPeriod !== 'this_year' && 'text-transparent')}
										/>
										{$t('common.this_year')}
									</Command.Item>
									<Command.Item
										value="last_year"
										onSelect={() => {
											changePeriod('last_year');
											closeAndFocusPeriodTrigger();
										}}
									>
										<CheckIcon
											class={cn('mr-2 size-4', pendingPeriod !== 'last_year' && 'text-transparent')}
										/>
										{$t('common.last_year')}
									</Command.Item>
								</Command.Group>
								<Command.Separator />
								<Command.Group heading={$t('common.filters.months')}>
									{#each periodOptions.slice(5) as period (period.value)}
										<Command.Item
											value={period.value}
											onSelect={() => {
												changePeriod(period.value);
												closeAndFocusPeriodTrigger();
											}}
										>
											<CheckIcon
												class={cn(
													'mr-2 size-4',
													pendingPeriod !== period.value && 'text-transparent'
												)}
											/>
											{$t(period.label)}
										</Command.Item>
									{/each}
								</Command.Group>
								{#if yearOptions.length > 0}
									<Command.Separator />
									<Command.Group heading={$t('common.filters.years')}>
										{#each yearOptions as year (year.value)}
											<Command.Item
												value={year.value}
												onSelect={() => {
													changePeriod(year.value);
													closeAndFocusPeriodTrigger();
												}}
											>
												<CheckIcon
													class={cn(
														'mr-2 size-4',
														pendingPeriod !== year.value && 'text-transparent'
													)}
												/>
												{year.label}
											</Command.Item>
										{/each}
									</Command.Group>
								{/if}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium">{$t('common.filters.category')}</p>
				<Popover.Root
					bind:open
					onOpenChange={(isOpen) => {
						if (isOpen) {
							categorySearchTerm = '';
							fetchCategories();
						}
					}}
				>
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
							<Command.Input
								placeholder={$t('common.filters.search_category')}
								bind:value={categorySearchTerm}
								oninput={(e) => handleCategorySearch(e.currentTarget.value)}
							/>
							<Command.List>
								{#if isLoadingCategories}
									<Command.Empty>{$t('common.loading')}...</Command.Empty>
								{:else if categories.length === 0}
									<Command.Empty>{$t('common.filters.no_category_found')}</Command.Empty>
								{:else}
									<Command.Group>
										<Command.Item
											value=""
											onSelect={() => {
												changeCategory('');
												categorySearchTerm = '';
												// Reset search and reload all categories
												fetchCategories();
												closeAndFocusTrigger();
											}}
										>
											<CheckIcon
												class={cn('mr-2 size-4', pendingCategory !== '' && 'text-transparent')}
											/>
											{$t('common.all')}
										</Command.Item>
										{#each categories as category (category.id)}
											<Command.Item
												value={category.name}
												onSelect={() => {
													changeCategory(category.name);
													categorySearchTerm = '';
													// Reset search and reload all categories
													fetchCategories();
													closeAndFocusTrigger();
												}}
											>
												<CheckIcon
													class={cn(
														'mr-2 size-4',
														pendingCategory !== category.name && 'text-transparent'
													)}
												/>
												{category.name}
											</Command.Item>
										{/each}
									</Command.Group>
								{/if}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>

			<div class="flex justify-start gap-2">
				<Button variant="outline" onclick={resetFilters} size="sm">
					{$t('common.filters.reset')}
				</Button>
				<Button onclick={applyFilters} size="sm">
					{$t('common.filters.apply')}
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
				<div class="flex flex-row justify-between">
					<p class="text-xs text-muted-foreground md:text-sm">
						{totalData}
						{$t('common.filters.total_transactions')}
					</p>
					<p class="text-xs text-muted-foreground md:text-sm">
						<span class={cn(netBalance >= 0 ? 'text-green-600' : 'text-red-600')}>
							{formatCurrency(netBalance)}
						</span>
						{$t('common.summary.net_balance')}
					</p>
				</div>
				<TransactionList {transactions} {isLoading} />

				<!-- Pagination -->
				<div class="space-y-2">
					<label for="items-per-page" class="text-sm font-medium"
						>{$t('common.filters.items_per_page')}</label
					>
					<select
						id="items-per-page"
						bind:value={itemsPerPage}
						on:change={() => {
							currentPage = 1;
							fetchTransactions();
						}}
						class="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each paginationOptions as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</div>

				{#if totalPages > 1}
					<div
						class="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0"
					>
						<p class="text-center text-sm text-muted-foreground sm:text-left">
							Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(
								currentPage * itemsPerPage,
								totalData
							)} of {totalData} transactions
						</p>
						<div class="flex items-center justify-center gap-2 sm:justify-end">
							<Button
								variant="outline"
								size="sm"
								onclick={prevPage}
								disabled={currentPage === 1}
								class="h-8 w-8 p-0"
							>
								<ChevronLeftIcon class="h-4 w-4" />
							</Button>

							<div class="flex items-center gap-1">
								{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page (page)}
									{#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
										<Button
											variant={page === currentPage ? 'default' : 'outline'}
											size="sm"
											onclick={() => {
												currentPage = page;
												fetchTransactions();
											}}
											class="h-8 w-8 p-0"
										>
											{page}
										</Button>
									{:else if page === currentPage - 2 || page === currentPage + 2}
										<span class="px-2 text-muted-foreground">...</span>
									{/if}
								{/each}
							</div>

							<Button
								variant="outline"
								size="sm"
								onclick={nextPage}
								disabled={currentPage === totalPages}
								class="h-8 w-8 p-0"
							>
								<ChevronRightIcon class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</CardContent>
</Card>
