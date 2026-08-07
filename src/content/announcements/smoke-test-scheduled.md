---
id: smoke-test-scheduled
title: "Feed smoke test: this one is scheduled"
date: "2026-08-12 09:00"
kind: event
summary: "Dated in the future. It must not render, badge or count as unread until its instant passes."
actions:
  - label: "Store page"
    url: "https://arcticraven.itch.io/surface-labs"
    style: secondary
---

If you can read this before August 12, the publish gate is not working.

The feed is a schedule, not just a list: it ships future-dated entries so a
month of posts can go out in one publish, and the app reveals each one as its
instant passes. The gate is re-evaluated every time the list is built, so this
card should appear without a refetch if the app is left open across the
boundary.
