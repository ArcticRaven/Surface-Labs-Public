---
title: Features
description: An overview of Surface Labs, a node-based procedural texture authoring application.
---

Surface Labs is a node-based procedural texture authoring application. This page
gives a neutral overview of what it does. Specific capabilities that are not yet
documented are marked as TODO rather than assumed.

## Procedural texture authoring

Textures are defined as a set of operations rather than painted by hand. Because
the result is generated from its inputs, adjusting a parameter regenerates the
output instead of requiring manual rework. This keeps edits non-destructive.

## Node-based workflow

Work is organised as a graph of connected nodes. Each node performs an operation
and passes its result onward, so a texture can be built up step by step and
reworked at any point in the chain.

## Live preview

Surface Labs is intended to let you see the generated result as you build and
adjust a graph.

<!-- TODO: Confirm the exact preview behaviour (for example, resolution options
or real-time updates) before describing it in more detail. -->

## Additional capabilities

<!-- TODO: Document additional features here (for example, supported export
formats, import options and any integrations) once they are confirmed. Avoid
stating capabilities, platform support or file formats that have not been
verified. -->

## Related pages

- [Nodes](/docs/nodes/) — reference for the individual nodes.
- [Getting Started](/docs/getting-started/) — install and first steps.
