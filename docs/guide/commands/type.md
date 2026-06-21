# `.type()` - insert text

Schedules text to be inserted into the document one step at a time.

```ts
tw.timeline.type(text: string, options?: TTypeOptions): TimelineBuilder
```

Each step produces an **insert event** that places characters at the current cursor position and advances the cursor forward past them. The command advances the timeline clock by `steps × interval` ms.

## Options

```ts
type TTypeOptions = {
  by?: TAdvanceModeInput;       // default: "char"
  interval?: number;            // default: 50 (ms)
  style?: TStyleRef;
  cursor?: TCursorSelector;     // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to segment the text into steps |
| `interval` | `number` | `50` | Milliseconds between each step |
| `style` | `TStyleRef` | - | Style applied to every character as it is inserted |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor(s) to insert at |
| `before` | `TCallbackHook` | - | Hook fired before each step |
| `after` | `TCallbackHook` | - | Hook fired after each step |
| `audio` | `TAudioCommandOverride` | - | Per-command audio override |

## Advance modes (`by`)

The `by` option controls how the input text is split into steps. The default is `"char"`.

### String shortcuts

| Value | Step unit |
|---|---|
| `"char"` | One Unicode code unit per step |
| `"grapheme"` | One grapheme cluster per step, safe for emoji and composed characters |
| `"word"` | One whitespace-delimited word per step |
| `"line"` | One newline-delimited segment per step |
| `"whole"` | Entire text as a single step |

```ts
// One character at a time (default)
tw.timeline.type("Hello", { by: "char", interval: 80 });

// One grapheme cluster at a time - correct for emoji
tw.timeline.type("🇺🇸🇬🇧🇲🇦", { by: "grapheme", interval: 200 });

// One word at a time
tw.timeline.type("The quick brown fox", { by: "word", interval: 180 });

// One line at a time
tw.timeline.type("Line 1\nLine 2\nLine 3", { by: "line", interval: 500 });

// Everything at once in a single step
tw.timeline.type("All at once", { by: "whole", interval: 0 });
```

### Object form - multiple units per step

Pass `{ unit, amount }` to consume several units per step:

```ts
// 2 characters per step
tw.timeline.type("Hello!", { by: { unit: "char", amount: 2 }, interval: 220 });
// steps: "He" → "Hell" → "Hello!"

// 2 words per step
tw.timeline.type("one two three four five six", { by: { unit: "word", amount: 2 }, interval: 220 });
// steps: "one two " → "one two three four " → "one two three four five six"
```

If the remaining text does not fill a full chunk, the last step types whatever is left.

## Unicode and emoji

Use `"grapheme"` whenever the text contains multi-codepoint sequences. The `"char"` mode operates on JavaScript string indices (UTF-16 code units), which can split composite emoji or characters with combining marks.

```ts
// ✅ Each flag emoji is one grapheme cluster - types cleanly
tw.timeline.type("🇺🇸🇬🇧🇲🇦", { by: "grapheme", interval: 200 });

// ⚠️ This family emoji is a multi-codepoint sequence - use "grapheme"
tw.timeline.type("👨‍👩‍👧‍👦", { by: "grapheme" });

// ✅ Accented character with a combining mark
tw.timeline.type("café", { by: "grapheme", interval: 80 });
```

## Styling text while typing

Pass a [`TStyleRef`](/api/type-aliases/TStyleRef) to the `style` option. Every character inserted by this command carries that style in the document's style list.

```ts
// Apply a CSS class to the typed text
tw.timeline.type("Hello ", { style: "greeting", interval: 80 });

// Apply inline CSS
tw.timeline.type("World", {
  style: { css: { color: "#3b82f6", fontWeight: "bold" } },
  interval: 80,
});

// Combine class, inline CSS, and HTML attributes
tw.timeline.type("Warning", {
  style: {
    className: "warning",
    css: { color: "#f59e0b" },
    attrs: { "aria-label": "warning text", "role": "alert" },
  },
  interval: 70,
});

// ANSI style for terminal output via StringRenderer
tw.timeline.type("Error", {
  style: { ansi: { fg: "31", bold: "1" } },
  interval: 60,
});
```

Each inserted chunk receives a style range covering the span it occupies in the document. The DOM renderer coalesces adjacent identical styles into a single span when rendering.

Alternatively, use `.style()` after typing to attach a style to already-typed text, see [`.style()`](/guide/commands/style).

## Inserting text at a specific position

Text is inserted at the cursor's current position. Use `.move()` before `.type()` to target a different location:

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .move("start")
  .type("Hello ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world"
```

```ts
// Insert a sub-string in the middle of already-typed text
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(-5)             // cursor between "Hello " and "World"
  .type("Beautiful ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello Beautiful World"
```

## Replacing a selection

If the targeted cursor has an active selection when `.type()` fires, the **selected range is replaced** by the typed text on the first step. Subsequent steps insert normally at the cursor's new position:

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)
  .select(5)               // selects "World"
  .type("TypewriterJS");   // replaces "World" with "TypewriterJS"

await tw.play();
// result: "Hello TypewriterJS"
```

## Multi-cursor

Pass a `cursor` array to drive multiple cursors simultaneously. Each cursor types the same text independently at its own position in the shared document:

```ts
tw.timeline
  .type("A", { cursor: "a", by: "char", interval: 100 })
  .type("B", { cursor: "b", by: "char", interval: 100 });

// or drive both at once
tw.timeline.type(">>", { cursor: ["a", "b"], interval: 100 });
```

The DOM renderer renders one cursor element per active cursor.

## Examples

### Classic character-by-character

```ts
tw.timeline.type("Hello, world!", { by: "char", interval: 80 });

await tw.play();
```

### Fast typing that slows down at punctuation

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 60 })
  .type(",", { by: "char", interval: 180 })
  .type(" world", { by: "char", interval: 60 })
  .type("!", { by: "char", interval: 180 });

await tw.play();
```

### Word-by-word reveal

```ts
tw.timeline.type("The quick brown fox jumps over the lazy dog", {
  by: "word",
  interval: 160,
});

await tw.play();
```

### Loading indicator

```ts
tw.timeline
  .type("Loading", { by: "char", interval: 80 })
  .type(".", { by: "char", interval: 300 })
  .type(".", { by: "char", interval: 300 })
  .type(".", { by: "char", interval: 300 })
  .wait(400)
  .delete("whole")
  .type("Done", { by: "char", interval: 80 });

await tw.play();
```

### Multiline content

```ts
tw.timeline.type(
  "Line 1: setup\nLine 2: configure\nLine 3: deploy",
  { by: "line", interval: 600 }
);

await tw.play();
```

### Typed with color - error message

```ts
tw.timeline
  .type("Error: ", {
    style: { className: "error", css: { color: "#ef4444", fontWeight: "bold" } },
    by: "char",
    interval: 60,
  })
  .type("file not found", { by: "char", interval: 60 });

await tw.play();
```

## Edge cases

- **Empty string** - `.type("")` produces no steps and does not advance the clock.
- **Whitespace-only** - whitespace is typed character by character; it is not trimmed or collapsed.
- **Newlines** - `\n` is inserted verbatim. Use `white-space: pre` or `<pre>` in the DOM for visual line breaks.
- **Oversized `amount`** - if `amount` exceeds remaining units, the last step types whatever remains without error.
- **Unknown `by` value** - passing an unrecognised string such as `"custom"` throws an error at compile time. Only `"char"`, `"grapheme"`, `"word"`, `"line"`, and `"whole"` are accepted.

## Type reference

- [`TTypeOptions`](/api/type-aliases/TTypeOptions)
- [`TTypeCommand`](/api/type-aliases/TTypeCommand)
- [`TAdvanceMode`](/api/type-aliases/TAdvanceMode)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TAdvanceUnit`](/api/type-aliases/TAdvanceUnit)
- [`TStyleRef`](/api/type-aliases/TStyleRef)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
