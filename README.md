# Surface Labs

**Node-based procedural PBR textures: on desktop or tablet, with mouse, keyboard, Apple Pencil, touch, or controller.**

Surface Labs is a GPU-accelerated procedural texturing tool for game devs, 3D artists, and hobbyists. Compose shader-based nodes on an infinite canvas to build complete PBR material sets (albedo, normal, roughness, metallic, AO, height) with real-time evaluation and a live 3D preview under real HDR lighting, then export straight into Unreal, Unity, or Godot.

It's cross-platform from a single codebase and meets you on whatever hardware you've got: sketch a graph on the couch with a Pencil, refine it at the desk with a mouse, even drive the whole thing from a controller.

[![Get it on itch.io](https://img.shields.io/badge/itch.io-Play%20%2F%20Download-FA5C5C?style=for-the-badge&logo=itchdotio&logoColor=white)](https://arcticraven.itch.io/surface-labs)
[![Join our Discord](https://img.shields.io/badge/Discord-Join%20the%20community-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/invite/MjzQgVK9Jn)

---

## Why Surface Labs

- **Works the way you do.** Full support for mouse, keyboard, Apple Pencil, touch, *and* game controllers, on desktop or tablet, whichever's in reach.
- **Cross-platform from one codebase.** Built on Flutter so the same node workflow runs natively across platforms, not a stripped-down mobile port.
- **Nodes that do more.** Many nodes fold what other editors spread across three to six (one Blend with every mode, one Histogram that scans *and* remaps, full-control Levels and Curves), so your graphs stay small and readable.
- **Programmable.** Write your own procedural nodes in a small built-in shading language when the stock library isn't enough, with no native shader compiler required.
- **GPU-first & non-destructive.** Every node runs as a fragment shader and the graph is the source of truth: tweak any upstream step and everything downstream updates in real time, up to 4K.

## Features

- **Infinite node canvas**: pan, zoom, grid, minimap, marquee multi-select, reroutes, comments, annotations, and full undo/redo.
- **Broad node library**: generators (Perlin, FBM, Voronoi, Cells, Anisotropic Noise, Clouds, Checker, Gradient, Shape, Brick, Tile Sampler), filters (Detail/Quick/Slope/Directional Blur, Sharpen, Levels, Curves, Brightness/Contrast, HSL Shift, Threshold, Posterize, Invert, Gradient Map, Warp, Directional Warp), blending, transforms, normal & height maps (Normal from Height, Curvature, AO from Height, Edge Detect), channel extract/combine, histogram, and math, many of them multi-mode, doing the job of several nodes at once.
- **Custom shader nodes**: write your own node logic in a small built-in shading language, compiled and run on the GPU alongside the stock nodes.
- **Draw & Trim Sheet nodes**: hand-draw masks directly into the graph, and pack multiple materials into a trim sheet.
- **Live previews**: a 2D texture preview with channel isolation, plus a 3D PBR material preview with drag-to-orbit under imported HDR environments.
- **Properties panel**: typed controls per parameter, enum dropdowns, an RGB/HSL/Hex color editor, gradient and levels editors, and interactive tone curves.
- **Reusable subgraphs**: collapse any selection into a shareable subgraph.
- **Portable sharing**: export any node or subgraph as a `.surfacenode` package and import it on another machine.
- **Engine-aware export**: presets for Unreal Engine, Unity (URP & HDRP), Godot, and glTF / three.js, with correct ORM / channel packing and DirectX vs OpenGL normal orientation per target. Output as PNG, JPEG, TGA, or BMP.
- **Themeable UI**: built-in Dark, Light, High Contrast, and Soft Dark themes, plus a full custom theme editor.

## How It Compares

Surface Labs plays in the same space as Substance Designer, Material Maker, and Blender's shader graph. Here's where it goes where they don't.

| | **Surface Labs** | **Substance Designer** | **Material Maker** | **Blender** |
|---|---|---|---|---|
| **Desktop *and* tablet** | ✅ One app, everywhere | Desktop only | Desktop only | Desktop only |
| **Touch + Apple Pencil** | ✅ | ❌ | ❌ | ❌ |
| **Controller / gamepad navigation** | ✅ | ❌ | ❌ | ❌ |
| **Offline, no account** | ✅ | ⚠️ Account required | ✅ | ✅ |
| **Built-in programmable shader nodes** | ✅ Runs anywhere | ✅ Desktop | ✅ Desktop | ⚠️ Scripting / OSL |
| **One-click game-engine export presets** | ✅ Unreal · Unity · Godot · glTF | ✅ | ✅ | ⚠️ Not export-focused |

## Built by a solo indie dev

Surface Labs is designed, coded, and shipped by one person. That means every node is hand-built with intent, releases move fast, and there's a direct line between your feedback and what gets built next: [drop an idea in Discord](https://discord.com/invite/MjzQgVK9Jn) and it might land in the next update. No committees, no roadmap held hostage by a parent company.

## Platforms

Surface Labs is built cross-platform from a single codebase, so more platforms are a packaging step away, not a rewrite.

- **Available now:** Windows · iPadOS
- **Coming soon:** macOS
- **Buildable today** (not yet officially distributed): Android · Linux

## File Formats

- **`.surfacelabs`**: the project archive, a portable, git-friendly ZIP holding your graph, embedded media, subgraphs, thumbnails, and export presets.
- **`.surfacenode`**: a portable node or subgraph package for sharing individual pieces.
- **`.surfacetheme`**: an exported custom UI theme.

## Community & Support

Questions, bug reports, feature requests, and texture-sharing all happen in the community:

- **Discord:** https://discord.com/invite/MjzQgVK9Jn
- **itch.io:** https://arcticraven.itch.io/surface-labs

---

Built with Flutter. Surface Labs is a work in progress. Thanks for being an early part of it.
