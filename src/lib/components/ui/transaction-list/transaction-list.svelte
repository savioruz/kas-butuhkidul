<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import type { Transaction } from '$lib/types/transaction';
	import { t } from '$lib/i18n';
	import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-svelte';
	import { API_BASE_URL } from '$lib/types/api';
	import { onDestroy } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	$: activeText = $t('common.status.active');
	$: inactiveText = $t('common.status.inactive');
	$: viewProofText = $t('common.transaction.actions.view_proof');
	$: incomeTypeText = $t('common.transaction.types.income');
	$: expenseTypeText = $t('common.transaction.types.expense');

	export let transactions: Transaction[] = [];
	export let isLoading = false;

	let showProofDialog = false;
	let selectedProof: string | null = null;
	let selectedProofTransaction: Transaction | null = null;

	let showDetailsDialog = false;
	let selectedTransaction: Transaction | null = null;
	let transactionDetails: Transaction | null = null;
	let isLoadingDetails = false;
	let detailsError: string | null = null;

	// Prefetch cache to store already fetched details
	const prefetchCache = new SvelteMap<string, Transaction>();
	let prefetchingIds = new SvelteSet<string>();
	let prefetchTimeout: number | null = null;

	function openProofDialog(transaction: Transaction) {
		selectedProof = transaction.proof || null;
		selectedProofTransaction = transaction;
		showProofDialog = true;
	}

	async function openDetailsDialog(transaction: Transaction) {
		selectedTransaction = transaction;
		showDetailsDialog = true;
		isLoadingDetails = true;
		detailsError = null;

		// Check if we already have cached details
		const cached = prefetchCache.get(transaction.id);
		if (cached) {
			transactionDetails = cached;
			isLoadingDetails = false;
			return;
		}

		// If not cached, fetch them
		await fetchTransactionDetails(transaction.id);
	}

	async function prefetchTransactionDetails(transactionId: string) {
		// Don't prefetch if already cached or currently prefetching
		if (prefetchCache.has(transactionId) || prefetchingIds.has(transactionId)) {
			return;
		}

		prefetchingIds.add(transactionId);

		try {
			const response = await fetch(`${API_BASE_URL}/v1/transactions/${transactionId}`);

			if (response.ok) {
				const data = await response.json();
				prefetchCache.set(transactionId, data.data);
			}
		} catch (error) {
			// Silent fail for prefetch - we'll try again when actually opening
			console.debug('Prefetch failed for transaction:', transactionId, error);
		} finally {
			prefetchingIds.delete(transactionId);
		}
	}

	function debouncedPrefetch(transactionId: string) {
		// Clear existing timeout
		if (prefetchTimeout) {
			clearTimeout(prefetchTimeout);
		}

		// Set new timeout for 300ms
		prefetchTimeout = setTimeout(() => {
			prefetchTransactionDetails(transactionId);
		}, 300);
	}

	async function fetchTransactionDetails(transactionId: string) {
		try {
			const response = await fetch(`${API_BASE_URL}/v1/transactions/${transactionId}`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			transactionDetails = data.data;

			// Cache for future use
			prefetchCache.set(transactionId, data.data);
		} catch (error) {
			console.error('Error fetching transaction details:', error);
			detailsError = 'Failed to load transaction details';
		} finally {
			isLoadingDetails = false;
		}
	}

	function formatAmount(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('id-ID');
	}

	// Prefetch a few transaction details when component mounts or transactions change
	$: if (transactions.length > 0) {
		// Prefetch first few transactions (up to 3) after a short delay
		setTimeout(() => {
			transactions.slice(0, 3).forEach((transaction) => {
				prefetchTransactionDetails(transaction.id);
			});
		}, 500);
	}

	// Cleanup timeout on component destroy
	onDestroy(() => {
		if (prefetchTimeout) {
			clearTimeout(prefetchTimeout);
		}
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center py-8 text-muted-foreground">
		{$t('common.loading_transactions')}
	</div>
{:else if transactions.length === 0}
	<div class="flex items-center justify-center py-8 text-muted-foreground">
		{$t('common.no_transactions_found')}
	</div>
{:else}
	<div class="w-full overflow-hidden rounded-md border">
		<div class="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-muted/50">
					<tr class="text-left">
						<th class="min-w-[80px] p-2 font-medium whitespace-nowrap sm:p-3"
							>{$t('common.transaction.fields.date')}</th
						>
						<th class="min-w-[40px] p-2 font-medium whitespace-nowrap sm:p-3"
							>{$t('common.transaction.fields.type')}</th
						>
						<th class="min-w-[200px] p-2 font-medium whitespace-nowrap sm:p-3"
							>{$t('common.transaction.fields.category')}</th
						>
						<th class="min-w-[300px] p-2 font-medium whitespace-nowrap sm:p-3"
							>{$t('common.transaction.fields.description')}</th
						>
						<th class="min-w-[100px] p-2 text-right font-medium whitespace-nowrap sm:p-3"
							>{$t('common.transaction.fields.amount_idr')}</th
						>
						{#if transactions.some((t) => t.proof)}
							<th class="min-w-[80px] p-2 font-medium whitespace-nowrap sm:p-3">
								{$t('common.transaction.fields.proof')}
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each transactions as t (t.id)}
						<tr
							class="cursor-pointer border-t hover:bg-muted/30"
							onclick={() => openDetailsDialog(t)}
							onmouseenter={() => debouncedPrefetch(t.id)}
						>
							<td class="p-2 text-xs whitespace-nowrap sm:p-3 sm:text-sm">{formatDate(t.date)}</td>
							<td class="p-2 whitespace-nowrap sm:p-3">
								<Tooltip.Provider>
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#if t.type === 'income'}
												<BanknoteArrowDown class="text-green-500" />
											{:else}
												<BanknoteArrowUp class="text-red-500" />
											{/if}
										</Tooltip.Trigger>
										<Tooltip.Content>
											<p>
												{t.type === 'income' ? incomeTypeText : expenseTypeText}
											</p>
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
							</td>
							<td
								class="max-w-[200px] truncate p-2 text-xs whitespace-nowrap sm:p-3 sm:text-sm"
								title={t.category_name}>{t.category_name}</td
							>
							<td
								class="max-w-[300px] truncate p-2 text-xs sm:max-w-[160px] sm:p-3 sm:text-sm"
								title={t.description || '-'}>{t.description || '-'}</td
							>
							<td
								class="p-2 text-left text-xs font-medium whitespace-nowrap tabular-nums sm:p-3 sm:text-sm"
							>
								{t.type === 'expense' ? '-' : ''}
								{formatAmount(t.amount)}
							</td>
							{#if t.proof}
								<td class="p-2 text-right whitespace-nowrap sm:p-3">
									<Button
										size="sm"
										variant="outline"
										onclick={(e) => {
											e.stopPropagation();
											openProofDialog(t);
										}}
										class="h-6 px-2 py-1 text-xs"
									>
										{viewProofText}
									</Button>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Scroll indicator for mobile -->
		<div class="block border-t bg-muted/20 p-2 text-center text-xs text-muted-foreground sm:hidden">
			← Scroll to see more →
		</div>
	</div>
{/if}

<!-- Proof Dialog -->
<Dialog.Root bind:open={showProofDialog}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>{$t('common.transaction.proof.dialog_title')}</Dialog.Title>
			{#if selectedProofTransaction}
				<Dialog.Description>
					{selectedProofTransaction.type === 'income'
						? $t('common.transaction.types.income')
						: $t('common.transaction.types.expense')} -
					{selectedProofTransaction.category_name} -
					{formatAmount(selectedProofTransaction.amount)}
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="mt-4">
			{#if selectedProof}
				<div class="flex justify-center">
					<img
						src={selectedProof}
						alt="Transaction proof"
						class="max-h-[400px] max-w-full rounded-lg object-contain shadow-lg"
						onerror={(e) => {
							const target = e.target as HTMLImageElement;
							if (target) {
								target.style.display = 'none';
								const sibling = target.nextElementSibling as HTMLElement;
								if (sibling) sibling.style.display = 'block';
							}
						}}
					/>
					<div class="hidden text-center text-muted-foreground">
						<p>{$t('common.transaction.proof.failed_to_load')}</p>
						<Button
							variant="outline"
							onclick={() => selectedProof && window.open(selectedProof, '_blank')}
							class="mt-2"
						>
							{$t('common.transaction.proof.open_in_new_tab')}
						</Button>
					</div>
				</div>
				<div class="mt-4 flex justify-center gap-2">
					<Button
						variant="outline"
						onclick={() => selectedProof && window.open(selectedProof, '_blank')}
					>
						{$t('common.transaction.proof.open_in_new_tab')}
					</Button>
					<Button variant="outline" onclick={() => (showProofDialog = false)}>
						{$t('common.transaction.actions.close')}
					</Button>
				</div>
			{:else}
				<p class="text-center text-muted-foreground">
					{$t('common.transaction.proof.no_proof_available')}
				</p>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Transaction Details Dialog -->
<Dialog.Root bind:open={showDetailsDialog}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>{$t('common.transaction.details.dialog_title')}</Dialog.Title>
			{#if selectedTransaction}
				<Dialog.Description>
					{selectedTransaction.type === 'income'
						? $t('common.transaction.types.income')
						: $t('common.transaction.types.expense')} -
					{formatAmount(selectedTransaction.amount)}
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="mt-4">
			{#if isLoadingDetails}
				<div class="flex items-center justify-center py-8">
					<p class="text-muted-foreground">{$t('common.loading')}...</p>
				</div>
			{:else if detailsError}
				<div class="py-8 text-center">
					<p class="text-red-600 dark:text-red-400">{detailsError}</p>
					<Button
						variant="outline"
						onclick={() => selectedTransaction && fetchTransactionDetails(selectedTransaction.id)}
						class="mt-4"
					>
						Retry
					</Button>
				</div>
			{:else if transactionDetails}
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="text-sm font-medium text-muted-foreground">
								{$t('common.transaction.fields.date')}
							</div>
							<p class="text-sm">{formatDate(transactionDetails.date)}</p>
						</div>
						<div>
							<div class="text-sm font-medium text-muted-foreground">
								{$t('common.transaction.fields.type')}
							</div>
							<Badge
								variant={transactionDetails.type === 'income' ? 'default' : 'destructive'}
								class="px-1 py-0.5 text-xs capitalize"
							>
								{transactionDetails.type === 'income' ? incomeTypeText : expenseTypeText}
							</Badge>
						</div>
					</div>

					<div>
						<div class="text-sm font-medium text-muted-foreground">
							{$t('common.transaction.fields.category')}
						</div>
						<p class="text-sm">{transactionDetails.category_name}</p>
					</div>

					<div>
						<div class="text-sm font-medium text-muted-foreground">
							{$t('common.transaction.fields.amount_idr')}
						</div>
						<p class="text-lg font-semibold">
							{transactionDetails.type === 'expense' ? '-' : ''}
							{formatAmount(transactionDetails.amount)}
						</p>
					</div>

					{#if transactionDetails.description}
						<div>
							<div class="text-sm font-medium text-muted-foreground">
								{$t('common.transaction.fields.description')}
							</div>
							<p class="text-sm">{transactionDetails.description}</p>
						</div>
					{/if}

					<div>
						<div class="text-sm font-medium text-muted-foreground">Status</div>
						<p class="text-sm">
							<Badge variant={transactionDetails.active ? 'default' : 'secondary'}>
								{transactionDetails.active ? activeText : inactiveText}
							</Badge>
						</p>
					</div>

					{#if transactionDetails.proof}
						<div>
							<div class="text-sm font-medium text-muted-foreground">
								{$t('common.transaction.fields.proof')}
							</div>
							<div class="mt-2">
								<Button
									size="sm"
									variant="outline"
									onclick={() => {
										if (transactionDetails) {
											openProofDialog(transactionDetails);
											showDetailsDialog = false;
										}
									}}
								>
									{viewProofText}
								</Button>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
						<div>
							<div class="text-xs font-medium text-muted-foreground">Created At</div>
							<p class="text-xs">
								{new Date(transactionDetails.created_at).toLocaleString('id-ID')}
							</p>
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground">Created By</div>
							<p class="text-xs">{transactionDetails.created_by}</p>
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground">Modified At</div>
							<p class="text-xs">
								{new Date(transactionDetails.modified_at).toLocaleString('id-ID')}
							</p>
						</div>
						<div>
							<div class="text-xs font-medium text-muted-foreground">Modified By</div>
							<p class="text-xs">{transactionDetails.modified_by}</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="mt-6 flex justify-end">
			<Button variant="outline" onclick={() => (showDetailsDialog = false)}>
				{$t('common.transaction.actions.close')}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
