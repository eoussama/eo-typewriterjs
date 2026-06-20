# `.style()` — apply a style to typed text

Applies a style style to a range of already-typed document text.

```ts
tw.timeline.style(
  style: TStyleRef,
  range: TStyleRange | "selection",
  options?: TStyleOptions
): TimelineBuilder
```

`.style()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. The applied style is permanent — it persists in the document until the marked text is deleted.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `style` | `TStyleRef` | The style to apply — a CSS class name or a `TStyleObject` |
| `range` | `TStyleRange \| "selection"` | Where to apply the style — absolute indices or the current selection |
| `options` | `TStyleOptions` | Optional cursor targeting |

## Options

```ts
type TStyleOptions = {
  cursor?: TCursorSelector; // default: "main"
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
// plain class name
tw.timeline.style("highlight", { from: 0, to: 5 });

// full style object
tw.timeline.style(
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

## Range (`TStyleRange`)

```ts
type TStyleRange = { from: number; to: number };
```

- `from` — inclusive start index (0-based character position in the document text)
- `to` — exclusive end index

```ts
// styles characters at indices 6, 7, 8, 9, 10 ("World" in "Hello World")
tw.timeline.style("highlight", { from: 6, to: 11 });
```

### Using `"selection"`

When `range` is `"selection"`, the style is applied to the targeted cursor's **current selection range** at the moment the event fires:

```ts
tw.timeline
  .type("Hello World")
  .move(6)
  .select(5) // selects "World" (indices 6–11)
  .style("highlight", "selection"); // styles exactly that range
```

The style is applied using the selection's `from`/`to` values — it is equivalent to calling `.style(style, { from: selection.from, to: selection.to })`. The selection itself is not affected by `.style()`; use `.move()` or `.type()` to clear it afterward.

## Styling text as it is typed

To attach a style to characters during insertion (rather than after), use the `style` option on `.type()`:

```ts
tw.timeline
  .type("Hello ", { style: "greeting", interval: 80 })
  .type("World!", { style: "accent", interval: 80 });
```

This is functionally equivalent to calling `.style()` immediately after each inserted character. See [`.type()`](/guide/commands/type#styling-text-while-typing) for details.

## Examples

### Highlight a word in already-typed text

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 6, to: 11 });

await tw.play();
// "World" is wrapped in a <span class="highlight"> in the DOM renderer
```

### Multiple styles

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 60 })
  .style("error", { from: 0, to: 5 }) // "Error"
  .style("muted", { from: 7, to: 21 }); // "file not found"

await tw.play();
```

### Inline CSS style

```ts
tw.timeline
  .type("Danger zone", { by: "char", interval: 80 })
  .style(
    { css: { color: "#ef4444", fontWeight: "bold" } },
    { from: 0, to: 6 }
  );

await tw.play();
// "Danger" renders with red bold text
```

### Selection-based style

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .move(6)
  .select(5)
  .style("highlight", "selection") // styles the selection
  .move(11); // clears the selection UI

await tw.play();
// "World" permanently carries the "highlight" class
```

### ANSI style for terminal output

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 20 })
  .style({ ansi: { fg: "31", bold: "1" } }, { from: 0, to: 5 });

await tw.play();

const renderer = stringRenderer();

// ...
renderer.toAnsiString(); // "\x1B[31;1mError\x1B[0m: file not found"
```

### Combined: class + attrs for accessibility

```ts
tw.timeline
  .type("Critical error occurred", { by: "char", interval: 60 })
  .style(
    { className: "alert", attrs: { "role": "alert", "aria-live": "assertive" } },
    { from: 0, to: 8 }
  );

await tw.play();
```

## Interaction with renderers

**DOM renderer** — each style produces a `<span>` wrapping the marked characters. If `className` is set, it is applied as a CSS class. If `css` is set, it is applied as inline styles. If `attrs` is set, the attributes are added to the span element. Overlapping styles produce nested spans.

**String renderer** — `toString()` ignores styles and returns plain text. `toAnsiString()` reads the `ansi` field of each style and wraps the styled range with ANSI escape codes.

**Custom renderers** — styles are available on `state.document.styles` as a `TTextStyle[]` array. Use `segmentRichText(document)` to get pre-segmented character ranges with merged style information.

## Interaction with deletion

When the document text is mutated by `.delete()`:
- Styles that fully cover the deleted range are **removed**.
- Styles that partially overlap the deleted range are **trimmed** to the new boundary.
- Styles that sit entirely before the deletion point are **shifted left** by the number of deleted characters.
- Styles that sit entirely after the deletion point are unaffected.

## Edge cases

- **`from === to`** — an empty style; applies to no characters. Valid but has no visible effect.
- **`from > to`** — undefined behavior. Always use `from < to`.
- **`range` out of document bounds** — the style is applied with the given indices even if they exceed the current document length. The renderer clips styles to the visible text.
- **`"selection"` with no active selection** — applies a zero-width style at the cursor position. Effectively a no-op.
- **Multiple styles on the same range** — all styles accumulate. The DOM renderer produces nested spans; `mergeStyles()` can merge them if needed.
- **Style survives replay** — styles applied in a previous `play()` are part of the document state. On `replay()`, the document is reset before compilation runs again, so styles are re-applied cleanly.

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
