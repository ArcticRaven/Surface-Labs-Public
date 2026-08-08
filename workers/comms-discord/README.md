# comms-discord

Posts newly-live entries from `/app/comms.json` to a Discord webhook, once each.

Discord is currently the only place users learn a release happened, and it is
the same JSON the app already syncs — so announcing in both places should cost
one publish, not two.

## Why a cron Worker rather than a build step

The feed is a schedule. A build on August 7 that emits a post dated August 20
would either announce it thirteen days early or never: build time and publish
time are the same moment for the site and different moments for the feed.

A cron tick asks the feed the same question the app asks — *what is live now?* —
so a scheduled post reaches Discord and the in-app card within a tick of each
other. That is the only behaviour that isn't confusing to someone watching both.

It is also a **separate** Worker from the site. The site's `wrangler.jsonc`
deploys `./dist` as static assets and nothing else; folding a cron trigger in
there would mean every routine site deploy also redeployed this, so switching
announcements on would stop being a deliberate act.

## Setup

**1. Create the Discord webhook.** In Discord: Server Settings → Integrations →
Webhooks → New Webhook. Pick the channel, name it, Copy Webhook URL. It looks
like `https://discord.com/api/webhooks/<id>/<token>`.

That URL *is* the credential — anyone holding it can post to that channel as
that webhook. It never goes in a file in this repo.

**2. Create the dedupe ledger.**

```bash
npx wrangler kv namespace create COMMS_STATE
```

Paste the printed id into `wrangler.jsonc`, replacing
`REPLACE_WITH_KV_NAMESPACE_ID`. Until you do, `wrangler deploy` fails here —
which is the intended outcome, because a Worker with no ledger would re-announce
every item on every tick.

**3. Store the webhook URL as a secret.**

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
```

**4. Deploy.** From this directory:

```bash
npx wrangler deploy
```

`DRY_RUN` ships as `"true"`, so the first deploys log what they *would* post and
write nothing. Check the logs (`npx wrangler tail`), then set `DRY_RUN` to
`"false"` in `wrangler.jsonc` and redeploy to arm it.

## First run

The first armed tick **seeds** rather than announces: it marks everything
currently live as already announced, writes a `seeded` key, and posts nothing.
The channel starts from "new posts from here on", which is what anyone turning
this on actually wants — without it, arming the Worker against a populated feed
would dump the entire back catalogue into the channel at once.

To re-seed later (after clearing the channel, say), delete the `seeded` key:

```bash
npx wrangler kv key delete --binding COMMS_STATE seeded
```

## Testing locally

```bash
npx wrangler dev --test-scheduled
# then, in another shell:
curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"
```

There is no `fetch` handler in production on purpose: a publicly reachable
trigger would be an unauthenticated way to make this account post to Discord,
and it would buy nothing that `--test-scheduled` and `DRY_RUN` don't.

## What gets posted

One embed per item — title, summary, the `primary` action's URL, an accent
colour per `kind`, and the publication timestamp. Remaining actions become a
line of markdown links above the embed, because a webhook without an application
behind it cannot render buttons.

Platform-restricted items still post — Discord has no platform to filter on —
with the platforms named in the embed footer, so a Windows-only notice doesn't
read as universal to someone on an iPad.

The body behind `path` is deliberately **not** re-hosted. It is written for the
app's reader, and a second copy in Discord is a second copy to keep in step.

## Failure behaviour

- A feed that is unreachable, malformed, or declares an unsupported `schema`
  means "post nothing this tick". Never "post something wrong".
- The ledger entry is written **after** a successful POST, so a failure retries
  next tick. This is deliberately the opposite of the app's one-time release
  toast, which records first: there, a duplicate notice that nags every launch is
  worse than a missed one. Here, a missed release announcement is the worse
  failure and a duplicate is merely untidy.
- A failed POST stops the run rather than skipping past it, so a rate limit or an
  outage can't reorder the channel relative to publication order.
- `429` is retried twice, honouring Discord's `retry_after`.

## Operational notes

Ids are permanent read-state keys in shipped apps, and they are this Worker's
dedupe keys too — the same property, used twice. Renaming a shipped id
re-announces the post here *and* re-notifies every reader in the app.
`comms-ids.json` in the repo root warns about exactly that at build time.
