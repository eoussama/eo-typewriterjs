# `.mark()` — apply a style to typed text

Applies a style mark to a range of already-typed document text.

```ts
tw.timeline.mark(
  style: TStyleRef,
  range: TMarkRange | "selection",
  options?: TMarkOptions
): TimelineBuilder
```

`.mark()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. The applied mark is permanent — it persists in the document until the marked text is deleted.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `style` | `TStyleRef` | The style to apply — a CSS class name or a `TStyleObject` |
| `range` | `TMarkRange \| "selection"` | Where to apply the style — absolute indices or the current selection |
| `options` | `TMarkOptions` | Optional cursor targeting |

## Options

```ts
type TMarkOptions = {
  cursor?: TCursorSelector; // default: "main"
};
```

The `cursor` option is only relevant when `range` is `"selection"` — it identifies whose selection to read.

## Style reference (`TStyleRef`)

A style reference is either a plain class name string or a `TStyleObject`:

```ts
// plain class name
tw.timeline.mark("highlight", { from: 0, to: 5 });

// full style object
tw.timeline.mark(
  {
    className: "error",
    css: { color: "#ef4444", fontWeight: "bold" },
    attrs: { "data-label": "error" },
    ansi: { fg: "31", bold: "1" },
  },
  { from: 0, to: 5 }
);
```

### `TStyleObject` fields

| Field | Type | Description |
|---|---|---|
| `className` | `string` | One or more CSS class names (space-separated) |
| `css` | `Record<string, string>` | Inline CSS properties applied to the rendered span |
| `attrs` | `Record<string, string>` | HTML attributes set on the rendered span |
| `ansi` | `Record<string, string>` | ANSI escape code segments used by `StringRenderer.toAnsiString()` |
| `meta` | `Record<string, unknown>` | Arbitrary metadata; available for custom renderer inspection |

All fields are optional. A `TStyleObject` with no fields is valid but has no visible effect.

## Range (`TMarkRange`)

```ts
type TMarkRange = { from: number; to: number };
```

- `from` — inclusive start index (0-based character position in the document text)
- `to` — exclusive end index

```ts
// marks characters at indices 6, 7, 8, 9, 10 ("World" in "Hello World")
tw.timeline.mark("highlight", { from: 6, to: 11 });
```

### Using `"selection"`

When `range` is `"selection"`, the mark is applied to the targeted cursor's **current selection range** at the moment the event fires:

```ts
tw.timeline
  .type("Hello World")
  .moveCursor(6)
  .select(5) // selects "World" (indices 6–11)
  .mark("highlight", "selection"); // marks exactly that range
```

The mark is applied using the selection's `from`/`to` values — it is equivalent to calling `.mark(style, { from: selection.from, to: selection.to })`. The selection itself is not affected by `.mark()`; use `.moveCursor()` or `.type()` to clear it afterward.

## Styling text as it is typed

To attach a style to characters during insertion (rather than after), use the `style` option on `.type()`:

```ts
tw.timeline
  .type("Hello ", { style: "greeting", interval: 80 })
  .type("World!", { style: "accent", interval: 80 });
```

This is functionally equivalent to calling `.mark()` immediately after each inserted character. See [`.type()`](/guide/commands/type#styling-text-while-typing) for details.

## Examples

### Highlight a word in already-typed text

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .mark("highlight", { from: 6, to: 11 });

await tw.play();
// "World" is wrapped in a <span class="highlight"> in the DOM renderer
```

### Multiple marks

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 60 })
  .mark("error", { from: 0, to: 5 }) // "Error"
  .mark("muted", { from: 7, to: 21 }); // "file not found"

await tw.play();
```

### Inline CSS mark

```ts
tw.timeline
  .type("Danger zone", { by: "char", interval: 80 })
  .mark(
    { css: { color: "#ef4444", fontWeight: "bold" } },
    { from: 0, to: 6 }
  );

await tw.play();
// "Danger" renders with red bold text
```

### Selection-based mark

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .moveCursor(6)
  .select(5)
  .mark("highlight", "selection") // marks the selection
  .moveCursor(11); // clears the selection UI

await tw.play();
// "World" permanently carries the "highlight" class
```

### ANSI mark for terminal output

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 20 })
  .mark({ ansi: { fg: "31", bold: "1" } }, { from: 0, to: 5 });

await tw.play();

const renderer = stringRenderer();

// ...
renderer.toAnsiString(); // "\x1B[31;1mError\x1B[0m: file not found"
```

### Combined: class + attrs for accessibility

```ts
tw.timeline
  .type("Critical error occurred", { by: "char", interval: 60 })
  .mark(
    { className: "alert", attrs: { "role": "alert", "aria-live": "assertive" } },
    { from: 0, to: 8 }
  );

await tw.play();
```

## Interaction with renderers

**DOM renderer** — each mark produces a `<span>` wrapping the marked characters. If `className` is set, it is applied as a CSS class. If `css` is set, it is applied as inline styles. If `attrs` is set, the attributes are added to the span element. Overlapping marks produce nested spans.

**String renderer** — `toString()` ignores marks and returns plain text. `toAnsiString()` reads the `ansi` field of each mark and wraps the marked range with ANSI escape codes.

**Custom renderers** — marks are available on `state.document.marks` as a `TTextMark[]` array. Use `segmentRichText(document)` to get pre-segmented character ranges with merged style information.

## Interaction with deletion

When the document text is mutated by `.delete()`:
- Marks that fully cover the deleted range are **removed**.
- Marks that partially overlap the deleted range are **trimmed** to the new boundary.
- Marks that sit entirely before the deletion point are **shifted left** by the number of deleted characters.
- Marks that sit entirely after the deletion point are unaffected.

## Edge cases

- **`from === to`** — an empty mark; applies to no characters. Valid but has no visible effect.
- **`from > to`** — undefined behavior. Always use `from < to`.
- **`range` out of document bounds** — the mark is applied with the given indices even if they exceed the current document length. The renderer clips marks to the visible text.
- **`"selection"` with no active selection** — applies a zero-width mark at the cursor position. Effectively a no-op.
- **Multiple marks on the same range** — all marks accumulate. The DOM renderer produces nested spans; `mergeStyles()` can merge them if needed.
- **Mark survives replay** — marks applied in a previous `play()` are part of the document state. On `replay()`, the document is reset before compilation runs again, so marks are re-applied cleanly.

## Type reference

- [`TMarkOptions`](/api/type-aliases/TMarkOptions)
- [`TMarkCommand`](/api/type-aliases/TMarkCommand)
- [`TMarkRange`](/api/type-aliases/TMarkRange)
- [`TStyleRef`](/api/type-aliases/TStyleRef)
- [`TStyleObject`](/api/type-aliases/TStyleObject)
- [`TTextMark`](/api/type-aliases/TTextMark)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
