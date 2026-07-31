---
title: "What's new in 1.2"
description: "A native Rust/wgpu rendering engine, an MCP server, GPU-compute erosion, custom nodes in full GLSL, 8192² authoring, and more."
date: 2026-07-31
author: Arctic
tags: [release, devlog]
---

Surface Labs 1.2 is the biggest release yet. The short version: a native
**Rust/wgpu** rendering engine, an **MCP server** for automation, real
GPU-compute nodes, and custom nodes that now take **full GLSL**. The whole thing
still runs on Windows, macOS, Linux, Android and iPad — same app, same node
library, same project file.

Here's the long version.

## A native Rust/wgpu core

Node evaluation, custom shaders and the export encoders now run on a native
Rust/wgpu engine. That's Direct3D 12 on Windows, Metal on macOS and iPad, and
Vulkan on Linux — the right backend on each platform, with one graph and one
project format on top.

It also lifts the ceilings. Author at up to **8192 × 8192**, in 8-, 16- or
32-bit float, and export OpenEXR. An M-series iPad renders 8192² — the tablet
isn't a reduced edition.

## Erosion and distance fields, as real compute passes

Two of the most-requested nodes landed, and they run as genuine GPU compute
rather than fragment-shader approximations:

- **Erosion** — hydraulic and thermal weathering. It *moves* material rather
  than blurring it, so what one area loses turns up downstream. Roughly 230 ms
  for 80 steps at 2048² on an RTX 3070.
- **Distance Field** — computed by jump flooding, seamless across the tile edge.

Alongside them: **Flood Fill** for per-region colour, scatter and query (the
backbone for tiles, bricks and panels), a **Trim Sheet** node, a **Text** node
that embeds its font into the project, and a long list of new filters and
blends.

## Custom nodes in full GLSL

The custom shader node used to speak a small built-in language. Now it's
**ordinary GLSL** — loops, helper functions, structs, arrays — compiled to a
real native pipeline and running alongside every other node.

A short declaration header becomes the node's ports and Properties controls:

```glsl
in sampler2D source;                    // @optional

param vec3 tint = vec3(1.0, 0.6, 0.2);  // @color
param float amount = 1.0;               // @range(0, 2)

vec4 shade(vec2 uv) {
    vec4 base = texture(source, uv);
    vec3 rgb = mix(vec3(uv.x, uv.y, 0.5), base.rgb, base.a);
    return vec4(rgb * tint * amount, 1.0);
}
```

Parameters bind as live uniforms, so dragging a slider re-renders without a
recompile. And a shader that hangs the GPU is quarantined instead of taking the
app down with it — fix it and it earns a fresh trial automatically.

## An MCP server

Surface Labs now ships an **MCP server**: a standard protocol interface that
lets external tools read and edit a project the same way you do. Inspect a
graph, add and rewire nodes, retune parameters, write a custom shader, render a
node and get the image back, export the texture set.

It comes in two shapes. **Live** is hosted by the running app against the
project you have open — edits land on your canvas and go into your undo history,
so `Ctrl+Z` works on them. **Headless** (`surface_lab_headless`) is a standalone
process with no window at all, driving `.surfacelabs` files from disk for batch
runs, scripted variants and CI.

Every edit goes through the same validation the canvas uses, so nothing can
leave a project in a state the app won't open. Add the server in one line:

```bash
claude mcp add --transport http surface-labs http://127.0.0.1:4319/mcp
```

## Smaller things worth naming

- A **memory guard** that warns before you run out, instead of failing a render.
- Resolution ceiling raised to **8192**.
- Fonts used by Text nodes **embed into the project**, so type renders
  identically on every machine.

## Next

Post-processing effects are up next, then engine plugins in 1.3, and the first
public beta after that.

Surface Labs is free during early access, on every platform. If you build
something with it, come show it off in [the Discord](https://discord.com/invite/MjzQgVK9Jn) —
feature requests there have a direct line to what gets built next.
