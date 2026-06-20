# `.type()` — insert text

Schedules text to be inserted into the document one step at a time.

```ts
tw.timeline.type(text: string, options?: TTypeOptions): TimelineBuilder
```

Each step produces an **insert event** that appends characters at the current cursor position and advances the cursor forward. The command advances the timeline clock by `steps × interval` ms.

## Options

```ts
type TTypeOptions = {
  by?: TAdvanceModeInput;      // default: "char"
  interval?: number;           // default: 50 (ms)
  style?: TStyleRef;
  cursor?: TCursorSelector;    // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to segment the text into steps |
| `interval` | `number` | `50` | Milliseconds between each step |
| `style` | `TStyleRef` | — | Style applied to every character as it is inserted |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor(s) to use |
| `before` | `TCallbackHook` | — | Hook fired before each step |
| `after` | `TCallbackHook` | — | Hook fired after each step |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override — `false` to silence, or a voice/volume object |

## Advance modes (`by`)

The `by` option controls how the input text is split into steps.

### String shortcuts

| Value | Step unit |
|---|---|
| `"char"` | One Unicode code unit per step (default) |
| `"grapheme"` | One grapheme cluster per step |
| `"word"` | One word per step |
| `"line"` | One line (split on `\n`) per step |
| `"custom"` | Entire text as a single step |

```ts
tw.timeline.type("Hello", { by: "char" }); // one code unit per step
tw.timeline.type("Hello", { by: "grapheme" }); // one grapheme cluster per step
tw.timeline.type("Hello world", { by: "word" }); // one word per step
tw.timeline.type("Line 1\nLine 2", { by: "line" }); // one line per step
tw.timeline.type("All at once", { by: "custom" }); // one step total
```

### Object form — custom chunk size

Pass `{ unit, amount }` to advance multiple units per step:

```ts
// 2 characters per step
tw.timeline.type("Hello!", { by: { unit: "char", amount: 2 } });
// steps: "He" → "Hell" → "Hello!"

// 3 words per step
tw.timeline.type("one two three four five", { by: { unit: "word", amount: 3 } });
// steps: "one two three " → "one two three four five"
```

## Unicode and emoji

Use `"grapheme"` when the text contains multi-codepoint sequences to prevent the cursor from landing in the middle of a grapheme cluster:

```ts
// ✅ Correct — each flag emoji is one grapheme cluster
tw.timeline.type("🇺🇸🇬🇧🇲🇦", { by: "grapheme" });

// ⚠️ May split composite emoji — use "grapheme" instead
tw.timeline.type("👨‍👩‍👧‍👦", { by: "char" });
```

> Accented characters composed with combining marks (e.g. `é` as `e` + combining acute) are also handled correctly under `"grapheme"`.

## Styling text while typing

Attach a [TStyleRef](/api/type-aliases/TStyleRef) via the `style` option. Every character inserted by this command carries the style style in the document's `marks` array.

```ts
// class name
tw.timeline.type("Hello ", { style: "greeting", interval: 80 });

// inline CSS
tw.timeline.type(" World", {
  style: { css: { color: "#3b82f6", fontWeight: "bold" } },
  interval: 80,
});

// combined: class + attrs
tw.timeline.type("Error", {
  style: { className: "error", attrs: { "aria-label": "error text" } },
  interval: 60,
});
```

Each inserted character receives its own style with `from = charIndex` and `to = charIndex + 1`. Marks from consecutive `.type()` calls with the same style reference are **not** automatically merged, but renderers may coalesce adjacent identical marks when rendering.

## Typing at a cursor position

By default text is inserted at the current cursor position. Use `.move()` beforehand to insert at a specific location:

```ts
tw.timeline
  .type("world")
  .move(0)
  .type("Hello ");

await tw.play();
// result: "Hello world"
```

## Replacing a selection

If the targeted cursor has an active selection when `.type()` fires, the selected text is replaced by the typed text in a single step (before normal character-by-character insertion continues):

```ts
tw.timeline
  .type("Hello World")
  .move(6)
  .select(5) // selects "World"
  .type("there"); // replaces selection with "there"

await tw.play();
// result: "Hello there"
```

## Multi-cursor

Pass a `cursor` array to drive multiple cursors with the same command. Each cursor receives the same text, inserted at that cursor's current position:

```ts
// drive cursors "a" and "b" simultaneously
tw.timeline.type("Hello!", { cursor: ["a", "b"] });
```

The DOM renderer renders one cursor element per active cursor. Each cursor types independently into its own position in the same shared document.

## Edge cases

- **Empty string** — `.type("")` produces no events and does not advance the clock.
- **Only whitespace** — whitespace is typed character by character. It is not trimmed.
- **Newlines** — `\n` characters are inserted into the document text verbatim. The DOM renderer wraps the output in a `<pre>` or `white-space: pre` context so newlines render as visual line breaks.
- **Very large `amount`** — if `amount` exceeds the remaining units, the last step types whatever is left; the command never over-runs the end of the text.

## Examples

```ts
// Simple word-by-word
tw.timeline.type("The quick brown fox", { by: "word", interval: 200 });

// Fast then slow
tw.timeline
  .type("Loading", { by: "char", interval: 40 })
  .type("...", { by: "char", interval: 300 });

// Multiline with line-level timing
tw.timeline.type("Line 1\nLine 2\nLine 3", { by: "line", interval: 500 });

// Type and immediately apply a style
tw.timeline
  .type("Error: ", { style: "error", interval: 80 })
  .type("file not found", { interval: 80 });
```

## Type reference

- [`TTypeOptions`](/api/type-aliases/TTypeOptions)
- [`TAdvanceMode`](/api/type-aliases/TAdvanceMode)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TAdvanceUnit`](/api/type-aliases/TAdvanceUnit)
- [`TStyleRef`](/api/type-aliases/TStyleRef)
- [`TTypeCommand`](/api/type-aliases/TTypeCommand)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
