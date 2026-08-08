---
id: choosing-a-preview-gpu
title: "Choosing which GPU renders the 3D preview"
date: "2026-08-06 09:00"
expires: "2026-09-15 09:00"
kind: release
platforms: [windows, macos, linux]
summary: "Settings, General lets you pick the adapter the preview and thumbnails use."
actions:
  - label: "Open the manual"
    url: "https://surfacelabs.app/docs/"
    style: primary
---

On a laptop with both an integrated and a discrete GPU, the preview does not
always pick the one you would. Settings, under General, lists every adapter the
system reports and lets you choose. The setting applies at the next launch,
since the render core starts once per session.

On Windows there is also a graphics backend choice. DirectX 12 is the tested
default; Vulkan is there as an escape hatch if a driver misbehaves, not as a
faster path — presentation goes through the same bridge either way, and a
machine with no Vulkan adapter falls back on its own.

This notice is shown on desktop only, because there is nothing to choose on iPad
or Android.
