---
id: smoke-test-all-features
title: "Feed smoke test: everything at once"
date: "2026-08-06 10:00"
kind: notice
priority: pinned
summary: "One card exercising every field the feed contract defines."
inline: |
  This paragraph is the **inline** body. It arrives with the feed itself and
  renders directly in the card, without a second request.
actions:
  - label: "Open the manual"
    url: "https://surfacelabs.app/docs/"
    style: primary
  - label: "Join the Discord"
    url: "https://discord.com/invite/MjzQgVK9Jn"
    style: secondary
  - label: "Store page"
    url: "https://arcticraven.itch.io/surface-labs"
    style: secondary
---

This is the fetched body. It lives at `comms/<id>.<hash>.md` and is downloaded
only when this card is opened, which is why the inline paragraph above and this
one are different things.

## What this card is checking

- The card renders with a **pinned** badge, above everything in its own group.
- The date header reads "August 6, 2026" no matter what timezone the device is
  in, because the string comes from the server.
- No version appears on the card anywhere. Every item in this feed reaches
  every version of the app, whichever build you are running.
- All three actions render, in order, with the first one styled as primary.
- This body was fetched on open rather than shipped with the feed.

## Markdown

Headings, paragraphs, `inline code`, **bold**, *italic* and links such as
[the release notes](/blog/whats-new-in-1-2-2) all render. That link was written
site-relative and rewritten to an absolute URL by the build, because the app
has no origin to resolve it against.

1. Ordered lists
2. work as well
3. as bullets

> Blockquotes render as blockquotes.

```glsl
// Fenced code passes through untouched.
vec3 shade(vec3 albedo, float roughness) {
    return albedo * (1.0 - roughness);
}
```

## Images

The image below was authored as a source asset and rewritten by the build into
a feed-relative WebP derivative capped at 1600px. If it renders, image handling
is correct end to end; if you get a grey box, the rewrite is broken.

![The Surface Labs editor with every panel open](../../assets/docs/editor-all-panels.webp)

| Tables | also |
|---|---|
| render | fine |

The three other smoke-test entries in this build are checking things you should
*not* be able to see: one is scheduled for the future, one has expired, and one
is restricted to desktop platforms.
