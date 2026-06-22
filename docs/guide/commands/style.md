<script setup>
const highlightWordCode = `const tw = createTypewriter({ renderer });
const highlight = { css: { background: "rgba(234,179,8,0.28)", borderRadius: "2px" } };

tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .style(highlight, { from: 6, to: 11 });

await tw.play();`;

const inlineCssStyleCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Danger zone ahead", { by: "char", interval: 70 })
  .style(
    { css: { color: "#ef4444", fontWeight: "bold", textDecoration: "underline" } },
    { from: 0, to: 6 }
  );

await tw.play();`;

const selectionStyleCode = `const tw = createTypewriter({ renderer });
const sel = { css: { background: "rgba(99,102,241,0.25)", borderRadius: "2px" } };

tw.timeline
  .type("The quick brown fox", { by: "char", interval: 70 })
  .wait(500)
  .move(-9)
  .select(5)
  .style(sel, { from: 10, to: 15 })
  .wait(600)
  .unstyle({ from: 10, to: 15 })
  .style({ css: { fontStyle: "italic", color: "#8b5cf6" } }, "selection")
  .move("end");

await tw.play();`;

const animateHighlightCode = `const tw = createTypewriter({ renderer });
const sel = { css: { background: "rgba(99,102,241,0.25)", borderRadius: "2px" } };

tw.timeline
  .type("Searching for pattern...", { by: "char", interval: 55 })
  .wait(800)
  .select("whole")
  .style(sel, { from: 0, to: 24 })
  .wait(1000)
  .unstyle({ from: 0, to: 24 })
  .style({ css: { background: "rgba(16,185,129,0.25)", color: "#065f46" } }, { from: 0, to: 9 });

await tw.play();`;
</script>

# `.style()` - apply a style to document text

Applies a style to a range of already-typed document text.

```ts
tw.timeline.style(
  style: TStyleRef,
  range: TStyleRange | "selection",
  options?: TStyleOptions
): TimelineBuilder
```

`.style()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. The applied style is permanent - it persists in the document state until the marked text is deleted or `.unstyle()` removes it.

`before` fires once before the style is applied. `after` fires once after the style is applied. The `audio` option, if set, triggers playback through the typing audio channel.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `style` | `TStyleRef` | The style to apply - a CSS class name string or a `TStyleObject` |
| `range` | `TStyleRange \| "selection"` | Where to apply the style - absolute `{ from, to }` indices or the cursor's current selection |
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
| `before` | `TCallbackHook` | - | Hook fired before the style is applied |
| `after` | `TCallbackHook` | - | Hook fired after the style is applied |
| `audio` | `TAudioCommandOverride` | - | Per-command audio override |

## Style reference (`TStyleRef`)

A style reference is either a plain class name string or a `TStyleObject`:

```ts
// Plain class name - simplest form
tw.timeline.style("highlight", { from: 6, to: 11 });

// Full style object - mix and match fields as needed
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
| `meta` | `Record<string, unknown>` | Arbitrary metadata - available for custom renderer inspection |

All fields are optional and can be used in any combination.

## Range (`TStyleRange`)

```ts
type TStyleRange = { from: number; to: number };
```

- `from` - inclusive start index (0-based character position in the document text)
- `to` - exclusive end index

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

`.style()` with `"selection"` reads the active selection range and then **clears the selection** as part of applying the event.

## Styling text as it is typed

To attach a style to characters during insertion rather than after, use the `style` option on `.type()`:

```ts
tw.timeline
  .type("Hello ", { style: "greeting", interval: 80 })
  .type("World!", { style: "accent", interval: 80 });
```

See [`.type()` - styling while typing](/guide/commands/type#styling-text-while-typing) for details.

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

<DocsPlayground :code="highlightWordCode" note="Yellow background (inline style) represents the highlight applied to 'World' via .style()." />

### Multiple non-overlapping styles

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 60 })
  .style("token-error",  { from: 0,  to: 5  })  // "Error"
  .style("token-colon",  { from: 5,  to: 7  })  // ": "
  .style("token-path",   { from: 7,  to: 21 }); // "file not found"

await tw.play();
```

### Inline CSS style - no class needed

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

<DocsPlayground :code="inlineCssStyleCode" />

### Selection-based style

```ts
tw.timeline
  .type("The quick brown fox", { by: "char", interval: 70 })
  .wait(500)
  .move(-9)
  .select(5)                         // selects "brown"
  .style("emphasis", "selection")   // marks "brown" and clears the selection
  .move("end");                      // cursor moves to end

await tw.play();
// "brown" permanently carries the "emphasis" class
```

<DocsPlayground :code="selectionStyleCode" note="Blue shows the text as selected (inline style). After 600ms the selection visual is removed and the italic/purple style is applied." />

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
  .style("searching", "selection")  // apply "searching" to everything; selection cleared
  .wait(1000)
  .unstyle({ from: 0, to: 24 })     // remove "searching"
  .style("found", { from: 0, to: 9 }); // apply "found" to "Searching"

await tw.play();
```

<DocsPlayground :code="animateHighlightCode" note="Blue simulates the selection over the whole text. After 1s the selection visual is replaced by a green highlight on 'Searching'." />

### Layered styles on the same range

```ts
tw.timeline
  .type("Important Notice", { by: "char", interval: 60 })
  .style("bold", { from: 0, to: 9 })
  .style("underline", { from: 0, to: 9 });

await tw.play();
// Renders: <span class="bold"><span class="underline">Important</span></span> Notice
// Both styles are present - the first style applied becomes the outermost span
```

## Interaction with renderers

The **DOM renderer** wraps styled characters in `<span>` elements. Each style ref on a segment produces its own span. When multiple styles cover the same range, they are rendered as nested spans: the first style applied is the outermost span and the last is the innermost. Within each span, styles are applied in this order:
1. `className` - added as CSS classes
2. `attrs` - added as HTML attributes
3. `css` - applied as inline styles

Use `segmentRichText(document)` to get pre-segmented ranges with their stacked style refs if your custom renderer needs to inspect or flatten the style layers.

The **string renderer** ignores styles in `toString()`. In `toAnsiString()`, the `ansi` field of each style is applied as ANSI escape codes.

## Interaction with deletion

When `.delete()` removes text that overlaps a styled range:

- Styles **fully inside** the deleted range are removed entirely.
- Styles **partially overlapping** the deleted range are trimmed to the new boundary.
- Styles **entirely outside** the deleted range are preserved and their indices are adjusted.

## Edge cases

- **`from === to`** - zero-width style; valid but has no visible effect.
- **`from > to`** - undefined behavior; always use `from < to`.
- **`"selection"` with no active selection** - the state is returned unchanged; no style is applied.
- **Multiple styles on the same range** - all accumulate as nested spans in the DOM renderer; no deduplication is performed.
- **Out-of-bounds range** - the style is stored with the given indices. Renderers clip to visible text length.

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
