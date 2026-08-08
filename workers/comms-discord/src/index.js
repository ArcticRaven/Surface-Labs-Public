// Posts newly-live comms entries to Discord.
//
// Reads the same /app/comms.json the Surface Labs app syncs, finds items whose
// publication instant has passed since the last run, and posts each one to a
// Discord webhook exactly once.
//
// ## Why this is a cron Worker and not a build step
//
// The obvious place for this is the end of `build-comms.mjs` — the entry is
// already in hand there. It does not work, for one reason: the feed is a
// schedule. A build on August 7 that emits a post dated August 20 would either
// announce it on the 7th, thirteen days early, or never. Build time and publish
// time are the same moment for the site and different moments for the feed.
//
// A cron tick reads the feed the way the app does — asking "what is live now?"
// — so a scheduled post reaches Discord and the in-app card within one tick of
// each other, which is the only behaviour that isn't confusing to someone
// watching both.
//
// ## Why a separate Worker
//
// The site's own wrangler.jsonc deploys ./dist as static assets and nothing
// else. Folding a cron trigger into it would mean every routine site deploy
// also redeploys this, so switching announcements on would stop being a
// deliberate act. Separate name, separate deploy, separate blast radius.
//
// ## Deduplication
//
// KV, keyed by item id. The contract makes ids permanent and never reused,
// which is exactly the property a dedupe ledger needs — and it is the same key
// the app uses for its own read state, so "already announced" and "already
// read" can never disagree about what counts as the same post.
//
// The write happens *after* a successful POST, deliberately the opposite of the
// app's one-time toast. There, recording first means a crash costs a missed
// notice rather than one that nags every launch. Here a missed release
// announcement is the worse failure and a duplicate is merely untidy, so the
// order flips.

/** Fallback when FEED_URL is not set in the environment. */
const DEFAULT_FEED_URL = 'https://surfacelabs.app/app/comms.json';

/** KV key prefix for "this id has been announced". */
const ANNOUNCED_PREFIX = 'announced:';

/**
 * KV key recording that the ledger has been initialised.
 *
 * Without it the first tick against a populated feed would announce the entire
 * back catalogue at once. Instead the first run marks everything currently live
 * as already announced and posts nothing — the channel starts from "new posts
 * from here on", which is what anyone turning this on actually wants.
 */
const SEEDED_KEY = 'seeded';

/**
 * Discord allows 5 requests per 2 seconds per webhook. A gap slightly above
 * that floor keeps a backlog of several posts inside the limit without needing
 * to model the bucket.
 */
const POST_INTERVAL_MS = 450;

/** Embed accent per kind, so a release is visually distinct from a notice. */
const KIND_COLORS = {
	release: 0x58a6ff,
	blog: 0x8b7cf6,
	event: 0x3fb950,
	notice: 0x8b949e,
};

/** Discord truncates silently past this; better to ellipsize deliberately. */
const MAX_DESCRIPTION = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
	async scheduled(event, env, ctx) {
		ctx.waitUntil(run(env));
	},

	// No fetch handler on purpose. A publicly reachable trigger would be an
	// unauthenticated way to make this account post to Discord, and there is
	// nothing it would buy: `wrangler dev --test-scheduled` drives the cron
	// path locally, and DRY_RUN shows what a real tick would send.
};

/**
 * Whether [value] is actually usable as a webhook.
 *
 * A secret can be *set* and still be useless — a mis-registered paste at
 * `wrangler secret put`'s hidden prompt stores an empty line, which is truthy
 * enough to look configured and fails at the only moment it matters: the first
 * real post, possibly weeks after setup. Checking the shape up front turns that
 * into one obvious log line instead of a silent retry loop.
 */
function isUsableWebhook(value) {
	if (typeof value !== 'string' || value.trim() === '') return false;
	let url;
	try {
		url = new URL(value.trim());
	} catch {
		return false;
	}
	return url.protocol === 'https:' && url.pathname.includes('/api/webhooks/');
}

export async function run(env) {
	// Trimmed, because a trailing newline survives a paste and `fetch` rejects
	// the result outright.
	const webhook = (env.DISCORD_WEBHOOK_URL ?? '').trim();
	const webhookOk = isUsableWebhook(webhook);
	const dryRun = env.DRY_RUN === 'true';

	if (!env.COMMS_STATE) {
		console.error('comms-discord: no COMMS_STATE KV binding; refusing to run without a ledger.');
		return;
	}
	// Muted runs go ahead without the secret so the whole path can be exercised
	// locally, where secrets are not present. An armed run without a usable one
	// cannot do anything, and says exactly which of the two problems it has
	// rather than failing later at the POST.
	if (!webhookOk && !dryRun) {
		console.error(
			webhook === ''
				? 'comms-discord: DISCORD_WEBHOOK_URL is not set. Run: wrangler secret put DISCORD_WEBHOOK_URL'
				: 'comms-discord: DISCORD_WEBHOOK_URL is set but is not a Discord webhook URL ' +
						`(${webhook.length} characters). It should look like ` +
						'https://discord.com/api/webhooks/<id>/<token>. Re-run: wrangler secret put DISCORD_WEBHOOK_URL',
		);
		return;
	}

	const feedUrl = env.FEED_URL ?? DEFAULT_FEED_URL;
	const feed = await fetchFeed(feedUrl);
	if (!feed) return;

	// One line stating the whole configuration, every tick.
	//
	// A muted run writes nothing at all — no Discord message and no ledger
	// entry — so "working correctly but muted" and "never ran" leave identical
	// traces everywhere else. This line is the difference between the two, and
	// it is the only way to confirm the thing is alive before arming it.
	console.log(
		`comms-discord: mode=${dryRun ? 'MUTED (dry run)' : 'LIVE'} ` +
			`webhook=${webhookOk ? 'ok' : webhook === '' ? 'MISSING' : 'INVALID'} ` +
			`feed=${feedUrl} version=${feed.version}`,
	);

	const now = Date.now();
	// Oldest first, so a backlog reads chronologically in the channel rather
	// than arriving newest-first the way the app's reverse-chronological list
	// wants it.
	const live = feed.items
		.filter((item) => isLive(item, now))
		.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));

	const seeded = await env.COMMS_STATE.get(SEEDED_KEY);
	if (!seeded) {
		if (dryRun) {
			console.log(
				`comms-discord: DRY_RUN first run — would seed ${live.length} live item(s) and post nothing.`,
			);
			return;
		}
		await Promise.all(
			live.map((item) => env.COMMS_STATE.put(ANNOUNCED_PREFIX + item.id, new Date().toISOString())),
		);
		await env.COMMS_STATE.put(SEEDED_KEY, new Date().toISOString());
		console.log(
			`comms-discord: seeded ${live.length} existing item(s) without posting. ` +
				`New entries from here on will be announced.`,
		);
		return;
	}

	let posted = 0;
	for (const item of live) {
		const key = ANNOUNCED_PREFIX + item.id;
		if (await env.COMMS_STATE.get(key)) continue;

		if (dryRun) {
			console.log(`comms-discord: DRY_RUN would post "${item.id}" — ${item.title}`);
			posted++;
			continue;
		}

		if (posted > 0) await sleep(POST_INTERVAL_MS);
		const sent = await postToDiscord(webhook, buildPayload(item));
		if (!sent) {
			// Leave the key unwritten so the next tick retries. Stopping rather
			// than continuing keeps the channel in publication order when the
			// failure is a rate limit or an outage affecting every request.
			console.error(`comms-discord: failed to post "${item.id}"; stopping, will retry next tick.`);
			break;
		}
		await env.COMMS_STATE.put(key, new Date().toISOString());
		posted++;
	}

	console.log(
		`comms-discord: ${live.length} live item(s), ${posted} announced${dryRun ? ' (dry run)' : ''}.`,
	);
}

/**
 * Reads the feed, applying the same document-level rejection rules the app
 * does. A malformed feed means "post nothing this tick", never "post
 * something wrong".
 */
async function fetchFeed(url) {
	let response;
	try {
		// The feed is served max-age=300 and this runs on a comparable cadence,
		// so a cached copy could be a full tick stale and delay an announcement
		// past the moment the app already showed the card. Bypass it.
		response = await fetch(url, { cf: { cacheTtl: 0, cacheEverything: false } });
	} catch (err) {
		console.error(`comms-discord: fetch failed (${err.message}).`);
		return null;
	}
	if (!response.ok) {
		console.error(`comms-discord: feed returned ${response.status}.`);
		return null;
	}

	let feed;
	try {
		feed = await response.json();
	} catch {
		console.error('comms-discord: feed is not valid JSON.');
		return null;
	}

	if (feed?.schema !== 1) {
		console.error(`comms-discord: unsupported schema ${feed?.schema}.`);
		return null;
	}
	if (!Array.isArray(feed.items)) {
		console.error('comms-discord: feed has no items array.');
		return null;
	}
	return feed;
}

/**
 * The same two gates the app applies, for the same reason: an item that has not
 * reached its publication instant does not exist yet, and one whose expiry has
 * passed is no longer being shown to anyone. Announcing either would put
 * Discord out of step with the card.
 *
 * An entry missing the fields the app requires is skipped rather than assumed —
 * the site's exporter fails the build on those, so seeing one here means
 * something is wrong and posting is the wrong response.
 */
function isLive(item, now) {
	if (!item?.id || !item.title || !item.publishedAt) return false;
	const published = Date.parse(item.publishedAt);
	if (Number.isNaN(published) || published > now) return false;
	if (item.expires) {
		const expires = Date.parse(item.expires);
		if (!Number.isNaN(expires) && expires <= now) return false;
	}
	return true;
}

/**
 * One embed per item.
 *
 * Summary rather than the full body: the body lives behind `path` and is
 * written for the app's reader, and re-hosting it in Discord would mean two
 * copies of the same prose drifting apart. The link is the first action's, if
 * the post has one — that is already the site's own judgement about where a
 * reader should be sent.
 */
function buildPayload(item) {
	const actions = Array.isArray(item.actions) ? item.actions : [];
	// `primary` is the site's designated destination; fall back to the first
	// action of any style rather than dropping the link entirely.
	const link = actions.find((a) => a?.style === 'primary')?.url ?? actions[0]?.url;

	let description = (item.summary || item.body || '').trim();
	if (description.length > MAX_DESCRIPTION) {
		description = `${description.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
	}

	const embed = {
		title: item.title,
		color: KIND_COLORS[item.kind] ?? KIND_COLORS.notice,
		timestamp: item.publishedAt,
	};
	if (description) embed.description = description;
	if (link) embed.url = link;

	// Platform-restricted posts still go to the channel — Discord has no
	// platform to filter on — but saying so up front stops a Windows-only
	// notice reading as universal to someone on an iPad.
	if (Array.isArray(item.platforms) && item.platforms.length > 0) {
		embed.footer = { text: item.platforms.map(platformLabel).join(' · ') };
	}

	// The remaining actions become a line of links under the embed. Discord
	// webhooks cannot render buttons without an application, and a bare list of
	// URLs is honest about what it is.
	const extras = actions.filter((a) => a?.url && a.url !== link);
	const content = extras.length
		? extras.map((a) => `[${a.label}](${a.url})`).join('  ·  ')
		: undefined;

	return { embeds: [embed], ...(content ? { content } : {}) };
}

const PLATFORM_LABELS = {
	windows: 'Windows',
	macos: 'macOS',
	linux: 'Linux',
	ios: 'iPadOS',
	android: 'Android',
};

const platformLabel = (id) => PLATFORM_LABELS[id] ?? id;

/**
 * Posts one payload, honouring a rate-limit response.
 *
 * Returns false rather than throwing on any failure: the caller's answer is
 * always "leave the ledger alone and retry next tick", and there is no error
 * here worth taking the whole run down for.
 */
async function postToDiscord(webhook, payload, attempt = 0) {
	let response;
	try {
		response = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} catch (err) {
		console.error(`comms-discord: POST failed (${err.message}).`);
		return false;
	}

	if (response.status === 429 && attempt < 2) {
		// Discord reports the wait in seconds, and expects to be believed.
		let retryAfter = 1;
		try {
			retryAfter = (await response.clone().json())?.retry_after ?? 1;
		} catch {
			/* Header-only 429; the default is fine. */
		}
		await sleep(Math.min(Number(retryAfter) * 1000 + 250, 10_000));
		return postToDiscord(webhook, payload, attempt + 1);
	}

	// 204 is the documented success for a webhook with no `wait` parameter.
	if (response.ok || response.status === 204) return true;

	console.error(`comms-discord: Discord returned ${response.status}.`);
	return false;
}
