# Debugging

This page covers tools and techniques for inspecting, stepping through, and diagnosing issues in typewriter timelines.

## Inspecting playback state

Two methods give you visibility into what the typewriter is doing at any moment:

### `tw.getState()`

Returns the current playback metadata:

```ts
const state = tw.getState();

console.log(state.status);      // "idle" | "playing" | "paused" | "stopped"
console.log(state.currentTime); // ms elapsed since the animation started
console.log(state.duration);    // total compiled duration in ms
console.log(state.rate);        // current playback speed multiplier
```

Use this to build a progress indicator or to gate UI interactions based on playback status.

### `tw.getLiveState()`

Returns the current document content, cursor positions, and selections:

```ts
const live = tw.getLiveState();

console.log(live.document.text);          // full plain text of the document
console.log(live.document.styles);        // array of TTextStyle entries
console.log(live.cursors["main"].index);  // cursor position
console.log(live.selections["main"]);     // active selection range, if any
```

Both methods return a snapshot. Mutating the returned objects has no effect on the running animation.

## Stepping through a timeline

Pause an animation and step through events one group at a time. This is useful for understanding exactly what each command does to the document:

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .wait(500)
  .delete(-5, { by: "char", interval: 40 });

// Start and immediately pause
await tw.play();
tw.pause();

// Step forward one event group at a time
tw.stepForward();
console.log(tw.getLiveState().document.text); // "H"

tw.stepForward();
console.log(tw.getLiveState().document.text); // "He"

tw.stepBackward();
console.log(tw.getLiveState().document.text); // "H"
```

`stepForward()` and `stepBackward()` use the compiled event stream, not the command list, so `.call()` callbacks do not fire during stepping.

## Seeking to a specific point

`seek(ms)` jumps instantly to an absolute timestamp in the timeline. Combine it with `getState().duration` to jump to any relative position:

```ts
const { duration } = tw.getState();

// Jump to the midpoint
tw.seek(duration / 2);

// Jump to the end
tw.seek(duration);

// Jump to 1 second in
tw.seek(1000);
```

Seeking uses a checkpoint system: the player snapshots state every 50 events, then replays forward from the nearest checkpoint. Seeking to a position near a checkpoint is fast; seeking backward from a late position may replay more events.

After seeking, the player is paused. Call `tw.play()` to resume from that position.

## Using hooks to log steps

The `before` and `after` hooks on every command let you print a trace without modifying the timeline logic:

```ts
tw.timeline.type("Hello world", {
  by: "word",
  interval: 200,
  before: ({ stepIndex, stepCount, state }) => {
    console.log(`[type] step ${stepIndex + 1}/${stepCount} | doc: "${state.document.text}"`);
  },
  after: ({ state }) => {
    console.log(`[type] after  | doc: "${state.document.text}"`);
  },
});
```

For instant commands, hooks fire once. For segmented commands (`type`, `delete`, `move` with a numeric offset, `select` with a numeric count) they fire once per step.

Hooks only run during sequential playback (`play()` / `replay()`). They are skipped during `seek()` and stepping.

## Using `.call()` as a breakpoint

Insert a `.call()` to pause at a known point and inspect state:

```ts
tw.timeline
  .type("Phase one", { by: "char", interval: 60 })
  .call(({ state }) => {
    console.log("After phase one:", state.document.text);
    // suspend playback until the returned promise resolves
    return new Promise<void>((resolve) => setTimeout(resolve, 5000));
  })
  .type("Phase two", { by: "char", interval: 60 });

await tw.play();
```

An async `.call()` suspends the animation until the promise settles, giving you time to inspect the output.

## Inspecting the compiled event stream

Access the raw compiled timeline via the `timeline` property. After at least one `play()` call, the commands have been compiled:

```ts
// Queue commands
tw.timeline.type("Hello").wait(500).delete(-5);

// Trigger compilation by starting playback (or just read commands pre-compile)
console.log(tw.timeline.commands); // ReadonlyArray<TCommand>
```

The compiled events themselves are not directly exposed on the public API, but stepping through with `stepForward()` and watching `getLiveState()` gives an equivalent view of what each event does.

## Slowing down playback

Use `setRate()` to slow the animation to a fraction of normal speed, making it easier to observe each step visually:

```ts
tw.setRate(0.1); // 10% speed
await tw.play();
```

Restore normal speed:

```ts
tw.setRate(1);
```

## Collecting all frames

To capture every intermediate document state (useful for debugging or generating test fixtures), use a custom renderer that records each `render()` call:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";
import { createTypewriter } from "eo-typewriterjs";

class FrameCapture implements IRenderer {
  readonly frames: string[] = [];

  mount(state: TTypewriterState): void {
    this.frames.push(state.document.text);
  }

  render(state: TTypewriterState): void {
    this.frames.push(state.document.text);
  }

  unmount(): void {}
}

const capture = new FrameCapture();
const tw = createTypewriter({ renderer: capture });

tw.timeline.type("Hi!", { by: "char", interval: 0 });
await tw.play();

console.log(capture.frames);
// ["", "H", "Hi", "Hi!"]
```

## Common issues

### Text appears all at once instead of character by character

The `interval` is missing or `0`, or the `by` mode is `"whole"`. Verify:

```ts
tw.timeline.type("Hello", { by: "char", interval: 80 }); // interval required for animation
```

### Newline renders as a space or is invisible

The output element needs to preserve whitespace. Use a `<pre>` tag or add `white-space: pre` via CSS:

```css
#output {
  white-space: pre;
}
```

### Styles not showing up on the element

Check that the class names in `.style("myClass", ...)` have matching CSS rules. Also confirm the style range indices are correct relative to the **current** document length, not a future length.

### `delete()` removes more characters than expected

If a selection is active when `.delete()` fires, the selected range is deleted and the numeric operand is ignored. Call `.unselect()` first if you want to delete by count, not by selection.

### Cursor is out of position after styling

`.style()` and `.unstyle()` with `"selection"` clear the selection after applying. If subsequent commands use `"selection"` as a range, they may target an empty selection. Use an explicit `{ from, to }` range if you need stable position references.

### `.call()` not firing during `seek()` or stepping

This is expected. `.call()` callbacks are runtime-only and do not have compiled events. They only run during sequential `play()` / `replay()` execution.

## Type reference

- [`TPlaybackControllerState`](/api/type-aliases/TPlaybackControllerState)
- [`TTypewriterState`](/api/type-aliases/TTypewriterState)
- [`TCallbackContext`](/api/type-aliases/TCallbackContext)
