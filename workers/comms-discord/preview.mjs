// Shows what the announcer would post, right now, without deploying anything.
//
// The deployed Worker wakes on a 10-minute cron and — while muted — writes
// nothing to Discord and nothing to its ledger. That is correct, but it means
// "configured and working" and "never ran" leave the same traces. Waiting for a
// tick to appear in `wrangler tail` is a slow way to answer a fast question.
//
// This runs the Worker's real logic, against the real live feed, with the
// ledger and Discord both faked in memory. Nothing is sent, nothing is stored,
// no credentials are touched. Run it with:
//
//   npm run preview
//
// It is a diagnostic, not part of the deploy.

import { run } from './src/index.js';

const FAKE_WEBHOOK = 'https://discord.com/api/webhooks/preview/preview';

const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
	if (String(url).startsWith(FAKE_WEBHOOK)) {
		sent.push(JSON.parse(init.body));
		return new Response(null, { status: 204 });
	}
	return realFetch(url, init);
};

const ledger = new Map();
const env = {
	DISCORD_WEBHOOK_URL: FAKE_WEBHOOK,
	COMMS_STATE: {
		get: async (key) => ledger.get(key) ?? null,
		put: async (key, value) => void ledger.set(key, value),
	},
	DRY_RUN: 'false',
	FEED_URL: process.env.FEED_URL,
};

console.log('\n1. First run — should mark everything live as seen and post nothing.\n');
await run(env);
console.log(`\n   messages that would have been sent: ${sent.length}`);

const seen = [...ledger.keys()]
	.filter((k) => k.startsWith('announced:'))
	.map((k) => k.slice('announced:'.length))
	.sort();
console.log(`\n   announcements it can currently see (${seen.length}):`);
for (const id of seen) console.log(`     - ${id}`);

console.log('\n2. Pretending the newest one is brand new, to show a real message.\n');
if (seen.length === 0) {
	console.log('   Nothing live in the feed, so there is nothing to preview.');
} else {
	ledger.delete(`announced:${seen[0]}`);
	await run(env);
	const message = sent.at(-1);
	if (message) {
		const embed = message.embeds[0];
		console.log('   Discord would receive:\n');
		console.log(`     title:  ${embed.title}`);
		console.log(`     text:   ${(embed.description ?? '(none)').split('\n')[0]}`);
		console.log(`     link:   ${embed.url ?? '(none)'}`);
		if (embed.footer) console.log(`     footer: ${embed.footer.text}`);
		if (message.content) console.log(`     extra:  ${message.content}`);
	}
}

console.log(
	'\nNothing above was sent and nothing was saved. This was a rehearsal against\n' +
		'the live feed using a throwaway ledger.\n',
);
