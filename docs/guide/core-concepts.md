# Core Concepts

Understanding the library's architecture helps you use it more effectively.

## The pipeline

Every typewriter animation passes through four stages:

```
Timeline commands
    ↓  compile()
Timeline events (with absolute timestamps)
    ↓  play()
Reducer (apply each event to state)
    ↓  renderer.render()
Output (DOM element / string / custom)
```

### 1. Commands to Events (compile)

You add **commands** to the timeline using the fluent builder methods:

| Method | Description |
|---|---|
| `.type(text, options?)` | Insert text step by step |
| `.delete(value, options?)` | Remove text from the cursor; accepts a positive or negative number, or `"start"`, `"end"`, `"whole"` |
| `.move(value, options?)` | Move the cursor by a positive or negative number of units, or jump to `"start"` or `"end"` |
| `.wait(duration)` | Pause before the next command |
| `.select(value, options?)` | Create a text selection; accepts a positive or negative number, or `"start"`, `"end"`, `"whole"` |
| `.unselect(options?)` | Remove the active selection from a cursor |
| `.style(style, range, options?)` | Apply a style to a document range |
| `.unstyle(range, options?)` | Remove text styles that overlap a range |
| `.call(fn, options?)` | Schedule an inline callback (sync or async) |

When `play()` is called, the timeline is compiled into a flat array of **timeline events**, one event per step, each stamped with an absolute timestamp. The timeline is compiled once when `play()` is first called, and the result is cached. Recompilation only happens when commands are added to the timeline. `replay()` reuses the same compiled output unless the timeline has changed since the last compile.

`wait`, `move`, `select`, `unselect`, `style`, `unstyle`, and `call` are special:
- `move` with a string boundary (`"start"` or `"end"`) generates one event per cursor and advances the clock by `interval` (or the default 50 ms); with a numeric offset it generates `ceil(|offset| / amount)` events per cursor and advances the clock by `steps × interval`; a zero offset generates no events and does not advance the clock
- `wait` generates no events but advances the internal clock
- `select` with a **string boundary** (`"start"`, `"end"`, `"whole"`) generates a single event per cursor and advances the clock by `interval` (or the default 50 ms); with a **numeric count** it generates `ceil(|count| / amount)` events per cursor (one per step, each growing the selection by one more unit) and advances the clock by `steps × interval`
- `unselect` generates a single instant event and does not advance the clock
- `style` generates one or more instant style events (one per cursor when `range` is `"selection"`) and does not advance the clock
- `unstyle` generates one or more instant unstyle events (one per cursor when `range` is `"selection"`) and does not advance the clock
- `call` executes the callback at the current clock position; if the callback returns a `Promise`, playback suspends until it settles

### 2. Events to State (reduce)

The **player** advances through events in timestamp order. For each event it calls the **reducer**, which produces a new immutable `TTypewriterState` (the rich-text document plus the cursor map).

### 3. State to Output (render)

After each state update, the **renderer** is called with the new state. The built-in DOM renderer reads the document text, all named cursor positions, and any active selections to paint the output correctly.

### Lifecycle hooks

Every command accepts optional `before` and `after` hooks. Both are plain callback functions that receive a `TCallbackContext`. For segmented commands (`.type()`, `.delete()`, `.move()` with a numeric offset, and `.select()` with a numeric count) they fire once per step; for all other commands they fire once around the whole operation:

```ts
tw.timeline.type("Hello", {
  by: "char",
  interval: 80,
  after: ({ stepIndex, stepCount }) => {
    console.log(`step ${stepIndex + 1} / ${stepCount}`);
  },
});
```

Hooks receive the same context as `.call()`: `state`, `stepIndex`, `stepCount`, `unit`, and `signal`.

## State shape

`TTypewriterState` contains:

| Field | Description |
|---|---|
| `document` | A `TRichTextDocument`, the current text content and its text styles |
| `cursors` | A `Record<string, TCursorState>`, named cursors, each with a position `index` and `visible` flag |
| `selections` | A `Record<string, TSelectionState>`, per-cursor active selection ranges (each with `from` and `to` indices) |

The default initial state has a single cursor named `"main"` at index `0` with no active selection.

The document text grows as insert events are applied and shrinks as delete events are applied. Each cursor's `index` tracks where the next insert or delete for that cursor will occur.

### `TRichTextDocument`

```ts
type TRichTextDocument = {
  readonly text: string;
  readonly styles: readonly TTextStyle[];
};
```

`styles` stores style annotations over the document text. `style()` appends entries, while `unstyle()` and `delete()` may trim, shift, or remove them. Each `TTextStyle` carries:

| Field | Type | Description |
|---|---|---|
| `from` | `number` | Start index (inclusive) |
| `to` | `number` | End index (exclusive) |
| `style` | `TStyleRef` | A class-name string or a `TStyleObject` |

Styles can overlap freely. The `segmentRichText()` helper (exported from `eo-typewriterjs`) slices the document into non-overlapping `TRichTextSegment` values, each carrying the ordered stack of active styles for that slice.

```ts
import { createTypewriter, domRenderer, segmentRichText, mergeStyles } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Hello")
  .style("greeting", { from: 0, to: 5 });

await tw.play();

const state = tw.getLiveState();
const segments = segmentRichText(state.document);
// [{ text: "Hello", from: 0, to: 5, styles: ["greeting"] }]

const merged = mergeStyles(segments[0]!.styles);
// { className: "greeting" }
```

## Advance modes

The `by` option on `.type()` and `.delete()` controls how text is segmented:

| Value | Description |
|---|---|
| `"char"` | One event per character (Unicode code-point based; suitable for most Latin text) |
| `"grapheme"` | One event per user-perceived character (Unicode grapheme cluster, handles composite emoji, ZWJ sequences, accented characters, etc.) |
| `"word"` | One event per word (trailing whitespace attached to the preceding word) |
| `"line"` | One event per line (newline attached to the preceding line) |
| `"whole"` | Entire text as a single event |
| `{ unit, amount }` | `amount` consecutive segments of the given unit joined into one event |

## Renderer contract

A renderer implements `IRenderer`. Only `render` is required; `mount` and `unmount` are optional:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";



const myRenderer: IRenderer = {
  render(state: TTypewriterState) {
    // required, called after each event
    console.log(state.document.text);
  },
  mount(state: TTypewriterState) {
    // optional, called before rendering begins (e.g. on play, replay, or seek from idle)
  },
  unmount() {
    // optional, called when the renderer is torn down
  },
};
```

Only `render` is required. `mount` and `unmount` are optional. You can implement this interface to write to a canvas, a terminal, a virtual DOM, or anything else.

## Timeline builder

`TimelineBuilder` is a fluent builder. Commands are stored in a readonly array and compiled when `play()` is called, so the same timeline can be replayed:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("EO TypewriterTS", { by: "char", interval: 60 })
  .wait(500)
  .delete(-2, { by: "char", interval: 80 })
  .wait(300)
  .type("JS ⌨️", { by: "char", interval: 80 });

await tw.play(); // compiles (if needed) and plays
await tw.replay(); // replays from the beginning (recompiles only if timeline changed)
```

## Audio

Typing sounds are disabled by default. Enable them by passing `audio: { enabled: true }` to `createTypewriter()`:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: { enabled: true },
});
```

You can control audio at runtime without stopping playback:

```ts
tw.setAudioEnabled(false);      // mute without stopping playback
tw.setAudioEnabled(true);       // unmute
tw.setAudioVolume(0.5);         // master volume, clamped to [0, 1]
tw.setAudioOptions(opts);       // replace full audio config
tw.getAudioOptions();           // snapshot of the current audio config
```

Per-command overrides let you silence or customize sound for individual commands:

```ts
tw.timeline
  .type("Silent line", { audio: false })
  .type("Loud line", { audio: { volume: 1 } });
```

See [`TAudioOptions`](/api/type-aliases/TAudioOptions) and [`EAudioStrategy`](/api/variables/EAudioStrategy) for the full configuration shape.

## Cursor

The default cursor is named `"main"` and is visible. You can customize it at creation time:

```ts
import { createTypewriter, domRenderer, ECursorKind } from "eo-typewriterjs";



const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: { kind: ECursorKind.BLOCK, animation: "blink" },
});
```

At runtime, use the cursor methods to hide, show, or update cursor options without stopping playback:

```ts
tw.setCursorVisible(false);                              // hide all cursors
tw.setCursorVisible(true, "main");                       // show a specific cursor
tw.setCursorOptions({ kind: ECursorKind.UNDERSCORE });   // change kind for all cursors
```

## Runtime controls

The `TTypewriter` object returned by `createTypewriter()` exposes full playback controls:

| Method | Description |
|---|---|
| `play()` | Start or resume, returns `Promise<void>` |
| `pause()` | Pause at the current position |
| `stop()` | Stop and reset to the initial blank state |
| `cancel()` | Stop but preserve the current rendered output |
| `replay()` | Restart from the beginning, returns `Promise<void>` |
| `seek(ms)` | Jump to an absolute timeline position |
| `stepForward()` | Apply the next event group and pause |
| `stepBackward()` | Undo the last event group and pause |
| `setRate(n)` | Set playback speed multiplier (e.g. `2` for double speed) |
| `getState()` | Current playback metadata: `status`, `currentTime`, `duration`, `rate` |
| `getLiveState()` | Current document, cursor positions, and selections |

See [Timeline](./timeline) for the full command reference.
