# `.style()` — apply a style to document text

Applies a style to a range of already-typed document text.

```ts
tw.timeline.style(
  style: TStyleRef,
  range: TStyleRange | "selection",
  options?: TStyleOptions
): TimelineBuilder
```

`.style()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. The applied style is permanent — it persists in the document state until the marked text is deleted or `.unstyle()` removes it.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `style` | `TStyleRef` | The style to apply — a CSS class name string or a `TStyleObject` |
| `range` | `TStyleRange \| "selection"` | Where to apply the style — absolute `{ from, to }` indices or the cursor's current selection |
| `options` | `TStyleOptions` | Optional cursor targeting and lifecycle hooks |

## Options

```ts
type TStyleOptions = {
  cursor?: TCursorSelector; // default: "main" (used when range is "selection")
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `TCursorSelector` | `"main"` | Whose selection to read when `range` is `"selection"` |
| `before` | `TCallbackHook` | — | Hook fired before the style is applied |
| `after` | `TCallbackHook` | — | Hook fired after the style is applied |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Style reference (`TStyleRef`)

A style reference is either a plain class name string or a `TStyleObject`:

```ts
// Plain class name — simplest form
tw.timeline.style("highlight", { from: 6, to: 11 });

// Full style object — mix and match fields as needed
tw.timeline.style(
  {
    className: "error",
    css: { color: "#ef4444", fontWeight: "bold" },
    attrs: { "data-label": "error", "role": "alert" },
    ansi: { fg: "31", bold: "1" },
    meta: { severity: "critical" },
  },
  { from: 0, to: 5 }
);
```

### `TStyleObject` fields

| Field | Type | Description |
|---|---|---|
| `className` | `string` | One or more CSS class names (space-separated), applied to the rendered span |
| `css` | `Record<string, string>` | Inline CSS properties applied to the rendered span |
| `attrs` | `Record<string, string>` | HTML attributes set on the rendered span (e.g. `aria-*`, `data-*`) |
| `ansi` | `Record<string, string>` | ANSI escape code segments used by `StringRenderer.toAnsiString()` |
| `meta` | `Record<string, unknown>` | Arbitrary metadata — available for custom renderer inspection |

All fields are optional and can be used in any combination.

## Range (`TStyleRange`)

```ts
type TStyleRange = { from: number; to: number };
```

- `from` — inclusive start index (0-based character position in the document text)
- `to` — exclusive end index

```ts
// Styles characters at indices 6, 7, 8, 9, 10 = "World" in "Hello World"
tw.timeline.style("highlight", { from: 6, to: 11 });
```

Ranges are evaluated against the document text at the moment the event fires during playback. An out-of-bounds range is stored as-is; renderers clip styles to the visible text length.

### Using `"selection"`

When `range` is `"selection"`, the style is applied to the targeted cursor's **current selection range** at the moment the event fires. This is equivalent to passing `{ from: selection.from, to: selection.to }`.

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)
  .select(5)                         // selects "World" (indices 6–11)
  .style("highlight", "selection"); // styles that range
```

`.style()` reads the selection range but does **not** clear the selection. Use `.move()` or `.unselect()` afterward to dismiss the visual highlight.

## Styling text as it is typed

To attach a style to characters during insertion rather than after, use the `style` option on `.type()`:

```ts
tw.timeline
  .type("Hello ", { style: "greeting", interval: 80 })
  .type("World!", { style: "accent", interval: 80 });
```

See [`.type()` — styling while typing](/guide/commands/type#styling-text-while-typing) for details.

## Examples

### Highlight a word after typing

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .style("highlight", { from: 6, to: 11 });

await tw.play();
// "World" is wrapped in a span with class "highlight"
```

### Multiple non-overlapping styles

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 60 })
  .style("token-error",  { from: 0,  to: 5  })  // "Error"
  .style("token-colon",  { from: 5,  to: 7  })  // ": "
  .style("token-path",   { from: 7,  to: 21 }); // "file not found"

await tw.play();
```

### Inline CSS style — no class needed

```ts
tw.timeline
  .type("Danger zone ahead", { by: "char", interval: 70 })
  .style(
    { css: { color: "#ef4444", fontWeight: "bold", textDecoration: "underline" } },
    { from: 0, to: 6 }
  );

await tw.play();
// "Danger" renders red, bold, and underlined
```

### Selection-based style

```ts
tw.timeline
  .type("The quick brown fox", { by: "char", interval: 70 })
  .wait(500)
  .move(-9)
  .select(5)                         // selects "brown"
  .style("emphasis", "selection")   // marks "brown"
  .move("end");                      // clears selection, moves to end

await tw.play();
// "brown" permanently carries the "emphasis" class
```

### Accessibility attributes via `attrs`

```ts
tw.timeline
  .type("Critical: disk full", { by: "char", interval: 60 })
  .style(
    {
      className: "alert",
      attrs: { role: "alert", "aria-live": "assertive" },
    },
    { from: 0, to: 8 }
  );

await tw.play();
// "Critical" span has role="alert" aria-live="assertive"
```

### ANSI style for terminal output

```ts
tw.timeline
  .type("Error: permission denied", { by: "char", interval: 40 })
  .style({ ansi: { fg: "31", bold: "1" } }, { from: 0, to: 5 });

await tw.play();

const renderer = stringRenderer();
// ...
console.log(renderer.toAnsiString());
// "\x1B[31;1mError\x1B[0m: permission denied"
```

### Animate a highlight then swap it

```ts
tw.timeline
  .type("Searching for pattern...", { by: "char", interval: 55 })
  .wait(800)
  .select("whole")
  .style("searching", "selection")  // apply "searching" to everything
  .unselect()
  .wait(1000)
  .unstyle({ from: 0, to: 24 })     // remove "searching"
  .style("found", { from: 0, to: 9 }); // apply "found" to "Searching"

await tw.play();
```

### Layered styles on the same range

```ts
tw.timeline
  .type("Important Notice", { by: "char", interval: 60 })
  .style("bold", { from: 0, to: 9 })
  .style("underline", { from: 0, to: 9 });
// Both styles accumulate — the DOM renderer produces nested spans

await tw.play();
```

## Interaction with renderers

The **DOM renderer** wraps styled characters in `<span>` elements. Styles are applied in this order:
1. `className` — added as CSS classes
2. `css` — applied as inline styles
3. `attrs` — added as HTML attributes

Overlapping styles on the same character range produce nested spans. Use `segmentRichText(document)` to get pre-segmented ranges with merged style metadata if your custom renderer needs a flat structure.

The **string renderer** ignores styles in `toString()`. In `toAnsiString()`, the `ansi` field of each style is applied as ANSI escape codes.

## Interaction with deletion

When `.delete()` removes text that overlaps a styled range:

- Styles **fully inside** the deleted range are removed entirely.
- Styles **partially overlapping** the deleted range are trimmed to the new boundary.
- Styles **entirely outside** the deleted range are preserved and their indices are adjusted.

## Edge cases

- **`from === to`** — zero-width style; valid but has no visible effect.
- **`from > to`** — undefined behavior; always use `from < to`.
- **`"selection"` with no active selection** — applies a zero-width style at the cursor position. Effectively a no-op in renderers.
- **Multiple styles on the same range** — all accumulate; no deduplication is performed.
- **Out-of-bounds range** — the style is stored with the given indices. Renderers clip to visible text length.

## Type reference

- [`TStyleOptions`](/api/type-aliases/TStyleOptions)
- [`TStyleCommand`](/api/type-aliases/TStyleCommand)
- [`TStyleRange`](/api/type-aliases/TStyleRange)
- [`TStyleRef`](/api/type-aliases/TStyleRef)
- [`TStyleObject`](/api/type-aliases/TStyleObject)
- [`TTextStyle`](/api/type-aliases/TTextStyle)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
