<script lang="ts">
	import { t } from '$lib/i18n';
	import DetailTransaction from './detail-transaction.svelte';
	import Summary from './summary.svelte';
</script>

<div class="min-h-screen bg-background py-8">
	<section class="py-2 sm:py-4 lg:py-6">
		<h1 class="text-center text-2xl font-bold">
			{$t('common.home.title')}
		</h1>
	</section>
	<!-- Summary Section -->
	<section class="py-2 sm:py-4 lg:py-6">
		<div class="w-full px-4">
			<Summary />
		</div>
	</section>
	<!-- Detail Section -->
	<section class="mt-8 py-2 sm:py-4 lg:py-6">
		<h1 class="px-3 text-start text-2xl font-bold">
			{$t('common.home.detail')}
		</h1>
	</section>
	<section class="py-2 sm:py-4 lg:py-6">
		<div class="mx-auto w-[320px] md:w-[512px] lg:w-full">
			<DetailTransaction />
		</div>
	</section>
</div>
