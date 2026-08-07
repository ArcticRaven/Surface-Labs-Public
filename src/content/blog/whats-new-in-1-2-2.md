---
title: "What's new in 1.2.2"
description: "A rebuilt 3D preview, subsurface scattering and bloom, a manual that updates itself, and a quality pass over the whole node library."
date: 2026-08-06
author: ArcticDev
tags: [release, devlog]
announce: true
announceKind: release
announcePriority: pinned
announceTime: "10:00"
---

1.2 was about the engine. 1.2.1 and 1.2.2 are about what you actually look at
while you work: the 3D preview, the node library, and the manual. 1.2.1 went out
quietly, so this post covers both.

Here is what changed.

## The 3D preview, rebuilt

The options list is now six sections (Model, Maps, Surface, Lighting,
Environment, Display), each with its own Reset and a dot that shows when
something inside it has been changed. A collapsed section still tells you you
have been in there.

A corner toolbar sits over the render itself. Camera, turntable, exposure and
the tonemapper are all reachable without leaving the viewport, and it fades out
of the way when you stop using it.

One click pops the preview out to fill the window. <kbd>Esc</kbd> brings it
back.

You can also inspect any single map on the model: unlit, unprocessed, exactly
as your graph authored it. `[` and `]` cycle through the maps the material
actually has. If a material has more than one PBR Output, you now pick which one
the preview shows.

## Thickness, emissive and bloom

Two new material channels, and a new look.

**Thickness** adds subsurface scattering: light passes through thin materials
instead of stopping at the surface, which is what wax, leaves and skin need. It
is a channel like any other, so it exports like any other. It replaces the old
Thin Wall toggle, which was preview-only and never made it into your files.

**Emissive** landed in 1.2.1. Parts of a material can glow, in the preview and
in exports.

**Bloom** lets bright highlights and emissives spill past their edges. It is off
by default, so turn it on when a material is meant to be a light source rather
than a surface.

## Surfaces that read as deep

Height maps cast their own shadows under the key light now. A new Parallax mode
adds fine detail
without subdividing anything, and displaced surfaces shade as real shape instead
of borrowing the flat normal. The Depth slider drives both height modes: at
zero, Parallax used to silently do nothing, which read as broken.

There is a new AgX tonemapper alongside ACES. Saturated colors hold instead of
washing out as they climb.

## Preview and export finally agree

The preview-only shading sliders are gone. The values the renderer shades with
come from the PBR Output node now, so there is no longer a set of numbers that
change what you see and nothing you ship. The Opacity input works. Reflections
are sharper, and colored textures stop darkening as they recede, because the mip
chain is filtered in linear light now.

It is also cheaper to leave open. The preview only redraws when something
changes, so it stops spinning your fans while you read. Exports run off the
render thread. On weak graphics hardware it steps down instead of failing, and
Windows gained a Vulkan option next to DirectX 12.

## A quality pass over the node library

Most of 1.2.2 is not a feature. It is two dozen nodes that were subtly wrong
under close inspection.

Voronoi and Cells cut their walls from the true distance to the region boundary,
so a wall holds one thickness instead of smearing into a soft shadow near a
corner, with Edge Width, Edge Softness and Rounding to size it. Brick's
Hexagon lattice lays an actual honeycomb; it used to collapse into stacked rows.
Herringbone is a real zigzag weave, instead of joints that started and stopped
mid-air.

Quick Blur actually blurs: past small radii it used to show nine ghosted copies
of the image. Big blurs and grows are cleaner across the board, with no dropout
speckle on thin lines, no onion rings along a blur map. Blurring a cut-out no
longer rings its soft edges with a dark halo.

Slope Blur got two fixes. Its Intensity response is gradual now, so the bottom
of the slider makes genuinely subtle changes instead of immediately reaching
across whole features. And it stopped speckling and terracing: the march reads
its driver through a small averaging filter and ignores gradients below the
noise floor.

The noises span their full range. Perlin, fBm, Clouds and Gabor used to hover in
the middle grays or clip into blobs.

Two of these change how existing projects look: mid-range Slope Blur values read
a little softer, and the widened noise ranges read a touch more contrasty. A
Levels node pulls the old range back where you need it.

## New controls

- **Region Query** gained its own Seed, so you can re-roll Random Value and
  Random Color without re-running the Flood Fill analysis behind it, and two
  Queries off one Flood Fill can now differ. It also gained a **Random Slope**
  mode: a grayscale ramp across each region, with its own angle. Feed it to
  Height Blend or Normal from Height for tilted tiles, stone steps and torn
  shingles.
- **Height Blend**'s mask is a real second output now, next to the height,
  instead of an either/or switch. Wire Height to your height channel and Blend
  Mask to the Blend nodes for the matching albedo and roughness layers, all
  along the same interlocking seam. Projects that had the switch set to Mask
  need to rewire from the new port.
- **Levels** gained a Channel selector, so grading one channel no longer needs a
  Channel Extract / Combine sandwich.
- **Edge Detect** gained Width, Rounding and Smoothing. **Bricks** gained Corner
  Radius and **Tile Sampler** a Rounding option.

## The manual left the app

The manual is no longer bundled. It downloads from this site on first launch and
stays cached for offline use, so it is always current and the install is
smaller. It is reachable from the toolbar search field, which finds manual
articles and nodes in the same list: type a few letters, and drag the node onto
the canvas or open the article over the editor.

That toolbar rework was 1.2.1: one row of icons around a single search field,
replacing the pile of buttons that was there before.

## Also in 1.2.1

- Import your own `.obj` or `.glb` into the 3D preview. It is embedded in the
  project, and a new Model UV node bakes the model's surface into texture data
  your graph can use.
- Full trim sheet support: preview and export a whole sheet as one material,
  including from the command line.

```
surface_lab_headless sheet.surfacelabs --out ./textures --format tiff
```

- A new Material node reuses a whole material inside another one.
- TIFF replaced JPEG on export. Lossy compression damages texture maps.
- Subgraphs keep collapsed nodes' exposed variables as parameters, and Channel
  Combine works with unwired inputs and gained alpha.
- Custom shaders stopped losing their code on save, autosave stopped freezing
  large graphs, and project files stopped bloating with assets nothing uses.
- The crash notice is a passing toast with an Export button now, instead of a
  dialog that blocked the hub.

Surface Labs is free during early access. If you build something with it, show
it off in [the Discord](https://discord.com/invite/MjzQgVK9Jn). Feature requests
there have a direct line to what ships next.
