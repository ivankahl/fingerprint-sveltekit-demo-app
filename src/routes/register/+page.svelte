<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';
    // Import the useVisitorData function from the FingerprintJS Pro Svelte package
    import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-svelte';

    export let form: ActionData;

    // Use the useVisitorData function to get the visitor ID and request ID from Fingerprint
    const { data, getData } = useVisitorData({ extendedResult: false, ignoreCache: true }, { immediate: true });
    getData();

    // Only let the form be submitted if both the visitor and request ID are present
    $: canSubmit = $data?.visitorId && $data.requestId;
</script>

<div class="card mx-auto max-w-md mt-12 p-4 spacing-2 drop-shadow-sm">
	<h1 class="text-3xl font-bold mb-2">Register</h1>
	{#if form?.message}
		<p class="alert variant-filled-error mb-2 py-2 px-3">{form?.message}</p>
	{/if}
	<form method="post" use:enhance class="space-y-2">
		<label class="label">
			<span>Email</span>
			<input name="email" type="email" class="input py-2 px-3" required />
		</label>
		<label class="label">
			<span>Password</span>
			<input name="password" type="password" class="input py-2 px-3" required />
		</label>
        <!-- Include the visitorId and requestId in the form submission -->
        <input type="hidden" name="visitorId" value={$data?.visitorId ?? ""} />
        <input type="hidden" name="requestId" value={$data?.requestId ?? ""} />
        <div class="flex items-center gap-3">
            <!-- Make sure the button is only enabled once the visitor and request ID is available-->
            <button type="submit" class="btn variant-filled-primary" disabled={!canSubmit}>Register</button>
            <span class="text-primary-300"> or <a href="/login" class="text-primary-500">Log In</a></span>
        </div>
	</form>
</div>
