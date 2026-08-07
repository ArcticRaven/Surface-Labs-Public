# `:::` directive namespace: resolution (site ↔ app)

Status: decided and implemented on the site side (`scripts/build-app-docs.mjs`).
Resolves the open decision in the app repo's `lib/features/help/BUNDLE_CONTRACT.md`
("`:::` is a shared namespace"). Companion to that contract; this file owns the
authoring rules and the exact serialization.

## Decision

There is no shared namespace at runtime. Starlight asides never reach the app
as directives: the export serializes them to plain CommonMark. The only `:::`
markers that cross the wire are the app's platform blocks, passed through
byte-for-byte. The app's fail-open preprocessor is therefore a safety net, not
a rendering path, and **no app-side change is required.**

## Authoring rules (docs pages, `src/content/docs/`)

| Marker | Meaning | Web rendering | In `articles/*.md` |
|---|---|---|---|
| `:::note[T]` `:::tip[T]` `:::caution[T]` `:::danger[T]` | Starlight aside, optional title `T` | Starlight callout | Blockquote (see below) |
| `:::caution[missing screenshot]` | Authoring placeholder | Callout (visible to reviewers) | **Stripped entirely** |
| `:::desktop` / `:::touch` | Platform block: content for that platform only | Blockquote with a bold "On desktop" / "On touch devices" lead-in | **Verbatim**, including the closing `:::` |
| Any other `:::name` | Reserved | n/a | **Build error** |

Canonical platform-block names are `:::desktop` and `:::touch`, the names the
shipped app (branch 1.2.1, `16be90e`) already implements. The prefixed forms
`:::app-desktop` / `:::app-touch` are reserved aliases: the site treats them
like platform blocks, but authors must not use them until the app's
preprocessor recognizes them. Nesting: an aside inside a platform block is
supported; a platform block inside an aside is not (the export does not
re-quote it correctly), so restructure the prose instead.

## Aside serialization

An aside in an exported article becomes a CommonMark blockquote:

```
:::caution[Taking turns]        >  > **Caution: Taking turns**
body text                       >  >
:::                             >  > body text
```

Labels: `note` → **Note**, `tip` → **Tip**, `caution` → **Caution**,
`danger` → **Warning**; with a title, `Label: Title`. This renders correctly
in any CommonMark renderer, today, with the shipped app. If the app's reader
later gains styled callouts, the export can switch back to emitting directive
syntax by changing one branch in `transformBody()`, so the authoring format does
not change either way.

## Platform tokens

`{{mod}}`, `{{alt}}`, `{{click}}`, `{{doubleclick}}`, `{{rightclick}}`,
`{{drag}}`, `{{platform}}` pass through the export verbatim; the app expands
them per platform. The website renders them as neutral wording via
`src/plugins/remark-app-tokens.mjs` ("Ctrl (Cmd on Mac)", "right-click", …).
Inside inline code or code fences they are left literal everywhere, so docs
can document the tokens themselves.

## Components

The only JSX allowed in docs pages is `<Tabs>`/`<TabItem label="…">`, which
the export serializes to `### <label>` sections. Any other component fails the
export build. This is the resolution of the contract's second open decision
(Starlight components): the allowed set is enforced, not advisory.
