# Authoring the in-app comms feed

`scripts/build-comms.mjs` publishes `/app/comms.json` and its bodies and
images. The app's News card reads that file on every launch, which is what
lets a release, a devlog, a sale or a notice go out **without shipping an app
build**.

Run `npm run build` (or `npm run build:comms` on its own) to regenerate it.
Nothing here reaches anyone until the change is pushed to `main`.

## The three sources

| What | Where | Shows up as |
|---|---|---|
| In-app announcement | `src/content/announcements/*.md` | A card, optionally with a body to read in-app |
| Devlog | `src/content/blog/*.md` with `announce: true` | A card linking to the post on the web |
| Release notes | `src/content/changelog/*.md` | Merged into the app's release-notes sheet |
| The "x.y.z available" pill | `src/comms-config.mjs` | A pill, and a one-time toast if pinned |

Announcements are never rendered publicly. There is no route for the
collection; the files exist only as the feed's source.

## Announcements

```markdown
---
id: winter-sale-2026
title: "Surface Labs is 40% off until January 5"
date: "2026-12-18 09:00"
kind: notice
priority: pinned
summary: "The winter sale runs through January 5."
expires: "2026-01-06 00:00"
actions:
  - label: "Open the store page"
    url: "https://arcticraven.itch.io/surface-labs"
    style: primary
---

Everything below the frontmatter is the body, fetched only when someone
opens the card.
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Lowercase slug. **Permanent** once shipped: it is the app's read-state key. |
| `title` | yes | One line. |
| `date` | yes | **Quoted** Eastern wall-clock time. May be in the future. |
| `kind` | no | `release` \| `blog` \| `notice` \| `event`. Card glyph only. Default `notice`. |
| `priority` | no | `pinned` sorts to the top in its own group and badges. Default `normal`. |
| `summary` | no | One sentence under the title. |
| `inline` | no | Short markdown rendered *in* the card. Use a YAML block scalar. |
| `actions` | no | Up to 3 buttons, each `label` + absolute `url` + `style`. |
| `requiresVersion` | no | Quoted `"1.2.6"`. Renders a muted tag. **Never hides the post.** |
| `platforms` | no | Any of `windows macos linux ios android`. Omit for all. This **does** hide the post. |
| `expires` | no | Quoted Eastern timestamp. Must be after `date`. |
| `draft` | no | `true` keeps it out of the feed entirely. |

The file's markdown body becomes `comms/<id>.<hash>.md`, downloaded only when
the card is opened. Leave the body empty for a card with nothing to expand.

Bodies are **plain markdown**. No Starlight `:::` asides, no JSX, no `{{mod}}`
tokens: the app renders CommonMark and anything else arrives as literal text,
so the build rejects it.

Images are written relative to the announcement file, the same way the docs and
the blog write them (`../../assets/docs/foo.webp`), and are rewritten into
feed-relative WebP derivatives capped at 1600px. Astro validates the source
path at build time, so a typo fails the build rather than shipping a grey box.
Site-relative links are rewritten to absolute URLs.

## Announcing a devlog

Add `announce: true` to a blog post's frontmatter. The post's slug becomes the
feed id, `description` becomes the summary, and the card gets one primary
"Read the devlog" button.

```yaml
announce: true
announceKind: release      # default: blog
announcePriority: pinned   # default: normal
announceTime: "13:00"      # Eastern time of day; default 09:00
announceActions:           # optional; replaces the default button
  - label: "Read the devlog"
    url: "https://surfacelabs.app/blog/whats-new-in-1-2-2"
    style: primary
```

Announced posts carry no in-app body. They are written for the web, with
images and video embeds, and are read there.

## Release notes

One file per version in `src/content/changelog/`:

```markdown
---
version: "1.2.2"
date: "2026-08-06"
---

## 1.2.2

- The 3D preview was rebuilt around six option sections.
- Thickness and Emissive channels were added.
```

A remote entry **replaces** a version already bundled in the app, which is how
a typo in shipped release notes gets fixed without a build. An entry newer than
the running build lands at the top in a "not installed" state with the update
action attached.

The body may only use headings, paragraphs and bullet lists. No links, no
emphasis, no code spans: the app's changelog parser accepts that subset and
renders anything else as literal punctuation. The build enforces it.

## Dates, and why they are quoted

Authors write Eastern; the build converts to an absolute UTC instant with a
real timezone database; the app compares instants. That is the whole reason a
scheduled post goes live at the same moment for every reader, with DST handled
correctly and no timezone code in the app at all.

**Quote every timestamp.** Unquoted, YAML may hand back a date object, which
reinterprets the wall time as UTC and moves the post by five hours.

A time inside the spring-forward gap fails the build rather than being rounded
into an hour nobody wrote.

**Future dates are a feature.** The feed is a schedule: a month of posts can
ship in one publish and the app reveals each one as its instant passes, with no
refetch. A future-dated item does not render, does not count as unread, does
not badge and does not toast.

## Version is deliberately not a filter

There is no minimum-version gate and adding one would be a regression. Someone
on an old build **should** see what they are missing; that is the reason to
update. `requiresVersion` renders a muted tag and nothing more.

`platforms` **is** a real filter, and the difference is the point: a Windows
user cannot act on a macOS-only notice, but they can act on a "this needs 1.2.6"
one by updating.

## Rules the build enforces

Everything the app would silently skip is a build error here instead. The app's
per-entry rejection rules exist so one bad entry cannot cost the reader the
other nineteen; they are not a licence to publish entries that get dropped.

- Every timestamp parses, exists in Eastern, and `expires` is after `date`.
- Ids are unique across announcements *and* announced blog posts.
- Actions have a label and an absolute URL; no more than three.
- Emitted bodies reference images only by feed-relative emitted paths.
- Changelog bodies stay inside the parser's subset.

`comms-ids.json` records every id ever published. An id disappearing is a
warning, not an error, because retiring an old post is legitimate. A **rename**
shows up there as one id vanishing and another appearing in the same build, and
is the thing to look out for: it re-notifies everyone who already read the post.

## Not done: the Discord webhook

Posting each new entry to Discord from this build step was considered and left
out. The build runs on every push, in an ephemeral CI container with no memory
of what it announced last time, so "post the new ones" has nothing durable to
compare against and a docs-only rebuild would re-announce the whole feed. It
needs either committed state or a scheduled job reading the published feed, and
neither belongs in the Astro build.
