---
title: "What's new in 1.2"
description: "A native Rust engine, a built-in MCP server, GPU-compute erosion, a full GLSL editor, and authoring up to 8192²."
date: 2026-07-31
author: Arctic
tags: [release, devlog]
---

1.2 is the biggest release so far. A new native Rust engine, a built-in MCP
server, GPU-compute nodes, and a full GLSL editor for custom nodes. Still one
app across Windows, macOS, Linux, Android and iPad.

Here is what changed.

## A native Rust engine

Node evaluation, custom shaders and the export encoders now run on a native
Rust engine, with the right graphics backend on each platform: Direct3D 12 on
Windows, Metal on macOS and iPad, Vulkan on Linux.

It also raises the ceiling. You can author up to 8192 × 8192 in 8, 16 or 32-bit
float. (8K is desktop-only for now. iPad support is in testing.)

Speed is the headline. Most nodes render in under a millisecond. Even a heavy
graph stays under two.

## Erosion and distance fields

Two long-requested nodes landed, both running as real GPU compute.

- **Erosion.** Hydraulic and thermal weathering that moves material instead of
  blurring it, so what one area loses shows up downstream. Around 230 ms for 80
  steps at 2048² on an RTX 3070.
- **Distance Field.** Computed by jump flooding, seamless across the tile edge.

Flood Fill, Trim Sheet and Text nodes came along with them, plus a pile of new
filters and blends.

## A full GLSL editor

The custom shader node is now a full GLSL editor. Write real shader code, and a
short header turns your declarations into ports and Properties controls.

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
recompile. If a shader hangs the GPU it gets quarantined instead of taking the
app down. Fix it and it runs again.

## A built-in MCP server

Surface Labs now ships its own MCP server. Point an AI client at it to read a
graph, add and rewire nodes, retune parameters, write a shader, render a node,
or export the whole texture set.

There are two ways to run it. Live, hosted by the running app against the
project you have open, with edits landing in your undo history. Headless, a
separate process driving .surfacelabs files from disk for batch jobs and CI.

Every edit runs through the same validation as the canvas, so a client cannot
leave a project in a state the app will not open. Add it in one line.

```bash
claude mcp add --transport http surface-labs http://127.0.0.1:4319/mcp
```

## Also in 1.2

- A memory guard that warns before you run out.
- Fonts used by Text nodes embed into the project, so type renders the same on
  every machine.

Surface Labs is free during early access. If you build something with it, show
it off in [the Discord](https://discord.com/invite/MjzQgVK9Jn). Feature requests
there have a direct line to what ships next.
