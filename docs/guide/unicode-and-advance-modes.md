# Unicode and Advance Modes

The `by` option on `.type()`, `.delete()`, `.move()`, and `.select()` controls how the input is segmented into steps. This page explains what each mode does, when to use each one, and how the library handles Unicode safely.

## Why it matters

JavaScript strings are UTF-16 sequences. A single user-perceived character can occupy one or two code units (`char`), one code point (`grapheme` simple case), or multiple code points joined by zero-width joiner sequences or combining marks. Stepping through a string by naive index will split composite characters mid-sequence, producing corrupted output.

The `by` option lets you choose the right segmentation granularity for your content.

## Advance modes

### `"char"` (default)

Steps one UTF-16 code unit at a time. Fast, but not safe for content that contains multi-code-unit characters (emoji above U+FFFF, flags, ZWJ sequences).

```ts
tw.timeline.type("Hello!", { by: "char", interval: 60 });
// steps: "H" → "He" → "Hel" → "Hell" → "Hello" → "Hello!"
```

**When to use:** ASCII or Latin text where every character maps to a single code unit.

### `"grapheme"`

Steps one user-perceived character (grapheme cluster) at a time. Safe for all Unicode content.

```ts
tw.timeline.type("I ❤️ open source 🚀", { by: "grapheme", interval: 80 });
// each emoji is one step, not two or three
```

Under the hood this uses the `Intl.Segmenter` API with `granularity: "grapheme"`.

**When to use:** Any text that may contain emoji, combining characters, accented letters, or content from scripts with complex composition rules. Prefer `"grapheme"` when in doubt.

### `"word"`

Steps one word at a time. Trailing whitespace is attached to the preceding word, so the cursor position stays natural.

```ts
tw.timeline.type("The quick brown fox", { by: "word", interval: 200 });
// steps: "The " → "The quick " → "The quick brown " → "The quick brown fox"
```

Uses `Intl.Segmenter` with `granularity: "word"`.

**When to use:** Subtitle-style animations, or any effect where word-level pacing reads better than character-level pacing.

### `"line"`

Steps one line at a time. The newline character is attached to the preceding line.

```ts
tw.timeline.type("Line one\nLine two\nLine three", { by: "line", interval: 400 });
// steps: "Line one\n" → "Line one\nLine two\n" → "Line one\nLine two\nLine three"
```

**When to use:** Terminal output simulation, multi-line reveals, or anywhere the natural unit is a line.

### `"whole"`

The entire input is a single step.

```ts
tw.timeline.type("Instant output", { by: "whole", interval: 0 });
// single step: "Instant output" (no animation delay)
```

**When to use:** Instant rendering, server-side snapshots, or test environments where you want deterministic zero-step output.

### Object form: `{ unit, amount }`

Combine any unit with a step size greater than one:

```ts
// 3 characters per step
tw.timeline.type("Loading...", { by: { unit: "char", amount: 3 }, interval: 60 });
// steps: "Loa" → "Loadin" → "Loading.." → "Loading..."

// 2 words per step
tw.timeline.type("one two three four five", { by: { unit: "word", amount: 2 }, interval: 200 });
// steps: "one two " → "one two three four " → "one two three four five"
```

This also works with `.delete()` and `.move()`.

## Mode reference table

| Mode | Unit | Unicode-safe | Typical use |
|---|---|---|---|
| `"char"` | UTF-16 code unit | ⚠️ Latin/ASCII only | Fast character typing |
| `"grapheme"` | Grapheme cluster | ✅ | General text, emoji, multilingual |
| `"word"` | Word segment | ✅ | Subtitle-style, flowing text |
| `"line"` | Newline-delimited line | ✅ | Terminal output, code blocks |
| `"whole"` | Full string | ✅ | Instant display, SSR, tests |
| `{ unit, amount }` | Multiple of any unit | Inherits from unit | Faster animations |

## Unicode examples

### Emoji (ZWJ sequences)

A family emoji `👨‍👩‍👧` is a ZWJ sequence of multiple code points. `"char"` steps through each code unit individually, breaking the sequence. `"grapheme"` keeps it together:

```ts
// Safe: one step per visible character
tw.timeline.type("Hello 👨‍👩‍👧!", { by: "grapheme", interval: 80 });

// Unsafe: may produce corrupted intermediate states
tw.timeline.type("Hello 👨‍👩‍👧!", { by: "char", interval: 80 });
```

### Flag emoji

Country flags are pairs of regional indicator symbols. `"char"` splits the pair; `"grapheme"` treats the pair as one unit:

```ts
tw.timeline.type("🇺🇸 🇯🇵 🇩🇪", { by: "grapheme", interval: 150 });
```

### Combining diacritics

Characters like `é` can be a single precomposed code point or a base letter + combining accent. `"grapheme"` handles both representations correctly:

```ts
tw.timeline.type("café résumé naïve", { by: "grapheme", interval: 70 });
```

### Mixed scripts

```ts
tw.timeline.type("Hello • مرحبا • 日本語", { by: "grapheme", interval: 80 });
```

## Delete and advance modes

`.delete()` accepts the same `by` option. The operand is the number of steps, not characters:

```ts
// Delete 3 grapheme clusters to the left of the cursor
tw.timeline.delete(-3, { by: "grapheme", interval: 60 });

// Delete 2 words to the right
tw.timeline.delete(2, { by: "word", interval: 100 });
```

The sign of the numeric operand controls direction: negative deletes to the left of the cursor, positive deletes to the right.

## Move and select

`.move()` uses the same `by` granularity for cursor repositioning:

```ts
// Move left one grapheme cluster at a time
tw.timeline.move(-3, { by: "grapheme", interval: 40 });

// Move right two words at a time
tw.timeline.move(2, { by: "word", interval: 80 });
```

`.select()` follows the same rules; the selection grows by one `by` unit per step.

## Choosing the right mode

| Scenario | Recommended mode |
|---|---|
| Simple English text, no emoji | `"char"` |
| Emoji, accents, multilingual text | `"grapheme"` |
| Word-by-word reveal | `"word"` |
| Terminal output simulation | `"line"` |
| Instant display or SSR snapshot | `"whole"` |
| Faster animation without changing `interval` | `{ unit: "char", amount: 3 }` |

When in doubt, use `"grapheme"`. It is safe for all Unicode and the performance difference is negligible for typical animation text lengths.
