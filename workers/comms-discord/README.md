# comms-discord

Posts new announcements to Discord automatically, once each.

Discord is currently the only place users learn a release happened, and it is
the same JSON the app already reads — so announcing in both places should cost
one publish, not two.

---

## What this actually is

A **Worker** is a small program that runs on Cloudflare's servers instead of on
your machine. You upload it once and Cloudflare runs it on a timer — there is no
server to keep switched on and nothing to restart.

This one wakes up **every 10 minutes**, reads
`https://surfacelabs.app/app/comms.json` (the same file the app reads), and asks:
*is there anything live now that I have not already posted to Discord?* If yes,
it posts it. If no, it goes back to sleep. That is the whole program.

**Why on a timer instead of when the site builds?** Because announcements can be
scheduled. If you write a post on the 1st dated for the 20th, a "post it when the
site builds" approach would announce it on the 1st — nineteen days early. The
timer asks the same question the app asks, so Discord and the app stay in step.

---

## Setup, once

You will run four commands. Each is explained below. Run them from **inside this
folder** (`workers/comms-discord`).

### Step 1 — connect your terminal to Cloudflare

```bash
npx wrangler login
```

`wrangler` is Cloudflare's command-line tool. It is already listed in this
project, so `npx` runs it without installing anything. This command opens your
browser and asks you to approve. You do this once per machine.

### Step 2 — create the "already posted" list

```bash
npx wrangler kv namespace create COMMS_STATE
```

**KV** is a tiny database in the cloud. This one holds a single kind of fact:
*"I already posted announcement X."*

Without it the Worker has no memory, so it would repost every announcement every
10 minutes, forever. That is why the deploy in step 4 will refuse to run until
this exists.

The command prints something like:

```
id = "a1b2c3d4e5f6...
```

Copy that id into `wrangler.jsonc`, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.

### Step 3 — give it the Discord webhook URL

Create the webhook in Discord first (Server Settings → Integrations → Webhooks),
copy the URL, then:

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
```

It will prompt you to paste the URL. It gets encrypted into your Cloudflare
account and is never written into this repo.

Treat that URL like a password — **anyone who has it can post to your Discord
channel.** That is the only reason it is a "secret" rather than a normal setting.

### Step 4 — upload it

```bash
npx wrangler deploy
```

That is it. Cloudflare now runs it every 10 minutes on its own.

---

## First run: it stays quiet on purpose

The very first time it runs for real, it does **not** post anything. It looks at
every announcement currently live, writes them all down as "already posted", and
stops.

This is deliberate. Without it, switching the Worker on would dump every
announcement you have ever written into the channel at once. Instead, the channel
starts from *new posts from here on*.

## Watching it work

It ships in **dry-run mode** — it logs what it *would* post and sends nothing.
Leave it that way for a few cycles and watch:

```bash
npx wrangler tail
```

That streams the Worker's log live. You will see a line every 10 minutes.

When you are happy, open `wrangler.jsonc`, change `"DRY_RUN": "true"` to
`"DRY_RUN": "false"`, and run `npx wrangler deploy` again. Now it is armed.

## Turning it off

```bash
npx wrangler delete
```

Removes the Worker entirely. Or set `DRY_RUN` back to `"true"` and redeploy to
mute it without removing it.

## Starting the channel over

If you clear the Discord channel and want the Worker to forget what it has
posted:

```bash
npx wrangler kv key delete --binding COMMS_STATE seeded
```

The next run treats itself as a first run again — writes everything down, posts
nothing.

## Testing without deploying

```bash
npm run dev
```

Then, in a second terminal:

```bash
curl "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*"
```

That triggers one cycle by hand against your machine instead of Cloudflare.

There is no public web address for this Worker on purpose — that would be an
unprotected way for anyone to make it post to your Discord.

---

## What a post looks like

One embed per announcement: the title, the summary, a link to wherever the
announcement's main button points, a colour depending on whether it is a release,
devlog, event or notice, and the publication date. Any extra buttons become a
line of links above it.

The long body of a post is deliberately **not** copied into Discord. It is
written for the app's reader, and a second copy is a second copy to keep in step.

Announcements restricted to certain platforms still get posted — Discord has no
way to show a post to only Windows users — with the platforms named in the
footer so it does not read as universal.

---

## If something goes wrong

Nothing here is loud. Every failure means "do nothing this cycle, try again in
10 minutes":

- Site unreachable, or the feed is malformed → posts nothing.
- Discord returns an error → the announcement is *not* written down as posted, so
  the next cycle retries it.
- Discord rate-limits → waits the amount Discord asks for, then retries twice.

The one thing it will never do is post something twice, because an announcement
is only written down as posted *after* Discord confirms it was received.

## One thing to be careful about

Announcement ids are permanent. They are how the Worker knows what it has already
posted, and separately how the app knows what you have already read.

**Renaming a published announcement's id reposts it to Discord and marks it
unread again for every user.** The build warns about this: `comms-ids.json` in
the repo root records every id that has ever shipped, and the build tells you if
one disappears.
