# `.unstyle()` — remove styles from a range

Removes text styles that overlap a given document range or cursor selection.

```ts
tw.timeline.unstyle(
  range: TStyleRange | "selection",
  options?: TUnstyleOptions
): TimelineBuilder
```

`.unstyle()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. Styles are never partially modified in-place — they are either removed entirely (if fully inside the range) or **clipped** to exclude the unstyle range (if they partially overlap).

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `range` | `TStyleRange \| "selection"` | The range to clear — absolute `{ from, to }` indices or the cursor's current selection |
| `options` | `TUnstyleOptions` | Optional cursor targeting and lifecycle hooks |

## Options

```ts
type TUnstyleOptions = {
  cursor?: TCursorSelector; // default: "main" (used when range is "selection")
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `TCursorSelector` | `"main"` | Whose selection to read when `range` is `"selection"` |
| `before` | `TCallbackHook` | — | Hook fired before the styles are removed |
| `after` | `TCallbackHook` | — | Hook fired after the styles are removed |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Range (`TStyleRange`)

```ts
type TStyleRange = { from: number; to: number };
```

- `from` — inclusive start index (0-based character position in the document text)
- `to` — exclusive end index

```ts
// Removes styles that overlap characters 6–10 ("World" in "Hello World")
tw.timeline.unstyle({ from: 6, to: 11 });
```

### Using `"selection"`

When `range` is `"selection"`, the styles are removed from the targeted cursor's **current selection range** at the moment the event fires. Unlike `.style("...", "selection")`, `.unstyle("selection")` **does clear the selection** after it runs.

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 }) // style the whole thing
  .wait(600)
  .move(-5)
  .select(5)               // selects "World"
  .unstyle("selection");   // removes styles from "World"; selection is also cleared
```

## Clipping behavior

Styles that partially overlap the unstyle range are clipped — not removed entirely. A style that spans the entire range is split into two fragments flanking the cleared area.

| Style position relative to unstyle range | Result |
|---|---|
| Entirely outside the range | Preserved unchanged |
| Entirely inside the range | Removed |
| Overlaps only from the left (`style.from < from`) | Clipped: `style.to` set to `from` |
| Overlaps only from the right (`style.to > to`) | Clipped: `style.from` set to `to` |
| Spans the entire range (`style.from < from` and `style.to > to`) | Split into two: `[style.from, from]` and `[to, style.to]` |

## Examples

### Remove a style by absolute range

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 })  // style everything
  .wait(800)
  .unstyle({ from: 6, to: 11 });            // remove from "World"

await tw.play();
// "Hello " still carries "highlight"; "World" does not
```

### Partial overlap is clipped, not removed

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 })  // one style covers 0–11
  .wait(600)
  .unstyle({ from: 3, to: 8 });             // unstyle the middle

await tw.play();
// style is split: [0, 3] and [8, 11] both keep "highlight"
// characters 3–7 are unstyled
```

### Span split — both ends are preserved

```ts
tw.timeline
  .type("ABCDEFGHIJ", { by: "char", interval: 60 })
  .style("marked", { from: 0, to: 10 })   // style all 10 characters
  .wait(500)
  .unstyle({ from: 3, to: 7 });           // unstyle the middle 4

await tw.play();
// "marked" style remains on [0, 3] and [7, 10]
// characters D, E, F, G (indices 3–6) are cleared
```

### Selection-based unstyle

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 })
  .wait(600)
  .move(-5)
  .select(5)           // selects "World"
  .unstyle("selection"); // removes styles from "World"; selection is cleared

await tw.play();
// "Hello " is still highlighted; "World" is not; selection UI is gone
```

### Remove multiple overlapping styles at once

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .style("bold",   { from: 0, to: 7 })   // "Hello W"
  .style("italic", { from: 4, to: 11 })  // "o World"
  .wait(600)
  .unstyle({ from: 4, to: 7 });          // remove styles from overlapping region

await tw.play();
// "bold"   is clipped to [0, 4]
// "italic" is clipped to [7, 11]
// characters 4–6 ("o W") carry no style
```

### Animate a style transition

```ts
tw.timeline
  .type("Deploying...", { by: "char", interval: 60 })
  .style("pending", { from: 0, to: 12 })
  .wait(1500)
  .unstyle({ from: 0, to: 12 })    // remove "pending"
  .style("success", { from: 0, to: 12 }); // apply "success"

await tw.play();
```

### Unstyle then restyle a word mid-animation

```ts
tw.timeline
  .type("Status: loading", { by: "char", interval: 60 })
  .style("status-loading", { from: 8, to: 15 })
  .wait(1200)
  .move(-7)
  .select(7)                          // selects "loading"
  .unstyle("selection")               // remove "status-loading" from "loading"
  .style("status-done", "selection"); // apply "status-done" to the same range

await tw.play();
// "loading" now carries "status-done" instead of "status-loading"
// selection was cleared by unstyle
```

## Interaction with renderers

`.unstyle()` modifies `state.document.styles`. On the next render frame, the DOM renderer re-renders affected spans, and `StringRenderer.toAnsiString()` reflects the updated style list.

## Relationship to `.style()`

`.unstyle()` is the inverse of `.style()`. Both share the same range input format and support `"selection"`. The key difference in selection behavior:

| Command | With `"selection"` | Clears selection afterward? |
|---|---|---|
| `.style()` | Reads selection range; applies style | No |
| `.unstyle()` | Reads selection range; removes styles | Yes |

## Edge cases

- **No styles in range** — no-op; the styles array is returned unchanged.
- **`from === to`** — empty range; no styles are affected.
- **`"selection"` with no active selection** — the state is returned unchanged; no styles removed, no error.
- **Range exceeds document bounds** — styles are evaluated against the provided indices numerically; out-of-bounds values produce correct results.

## Type reference

- [`TUnstyleOptions`](/api/type-aliases/TUnstyleOptions)
- [`TUnstyleCommand`](/api/type-aliases/TUnstyleCommand)
- [`TStyleRange`](/api/type-aliases/TStyleRange)
- [`TTextStyle`](/api/type-aliases/TTextStyle)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
