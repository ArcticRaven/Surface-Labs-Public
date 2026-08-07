---
id: smoke-test-expired
title: "Feed smoke test: this one has expired"
date: "2026-08-01 09:00"
expires: "2026-08-05 00:00"
kind: notice
summary: "Published in the past, expired in the past. It must not render."
---

If you can read this, the expiry filter is not working.

Expiry is filtered at render time as well as at parse time, because a cached
feed outlives the build that produced it: an app that has been offline for a
week must still stop showing a sale that ended on Tuesday.
