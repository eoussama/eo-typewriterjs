<script setup>
const selectWaitDismissCode = `const tw = createTypewriter({ renderer });
const sel = { css: { background: "rgba(99,102,241,0.25)", borderRadius: "2px" } };

tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(300)
  .select("whole")
  .style(sel, { from: 0, to: 11 })
  .wait(800)
  .unselect()
  .unstyle({ from: 0, to: 11 });

await tw.play();`;

const selectStyleUnselectCode = `const tw = createTypewriter({ renderer });
const sel = { css: { background: "rgba(99,102,241,0.25)", borderRadius: "2px" } };
const highlight = { css: { background: "rgba(234,179,8,0.28)", borderRadius: "2px" } };

tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)
  .select(5)
  .style(sel, { from: 6, to: 11 })
  .wait(600)
  .unselect()
  .unstyle({ from: 6, to: 11 })
  .style(highlight, { from: 6, to: 11 });

await tw.play();`;
</script>

# `.unselect()` - dismiss the active text selection

Removes the active text selection from one or more cursors without moving the cursor or mutating the document.

```ts
tw.timeline.unselect(options?: TUnselectOptions): TimelineBuilder
```

`.unselect()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. If the targeted cursor has no active selection, the command is a no-op.

## Options

```ts
type TUnselectOptions = {
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `TCursorSelector` | `"main"` | Which cursor(s) to clear the selection on |
| `before` | `TCallbackHook` | - | Hook fired before the selection is cleared |
| `after` | `TCallbackHook` | - | Hook fired after the selection is cleared |
| `audio` | `TAudioCommandOverride` | - | Per-command audio override |

## Behavior

- Removes the selection from each targeted cursor's state.
- The cursor's **text position is not changed**.
- If a targeted cursor has no active selection, that cursor is unaffected and no error is raised.
- Unlike `.move()`, `.unselect()` does not reposition the cursor - it only clears the selection metadata.
- `before` fires once before the selection is cleared. `after` fires once after the selection is cleared.
- The `audio` option, if set, triggers playback through the typing audio channel.

## When to use

Most of the time a selection is cleared automatically - `.type()`, `.delete()`, `.move()`, `.style("...", "selection")`, and `.unstyle("selection")` all discard it as a side effect. Use `.unselect()` when you need to remove a selection **without** any of those side effects:

- After `.select()` with a timed pause - to dismiss the visual highlight while leaving the cursor in place.
- To reset a cursor's selection state mid-animation as a pure visual cleanup step.

## Examples

### Select, wait, then dismiss

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(300)
  .select("whole")   // highlight everything
  .wait(800)
  .unselect();       // remove the highlight; cursor stays in place

await tw.play();
```

<DocsPlayground :code="selectWaitDismissCode" note="Blue (inline style) simulates the active selection. .unselect() dismisses the state, then .unstyle() removes the visual." />

### Select, apply a style, then clear without moving

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)
  .select(5)                            // selects "World"
  .style("highlight", { from: 6, to: 11 }) // applies style using absolute range; selection remains
  .unselect();                          // dismisses the selection; cursor stays at index 6

await tw.play();
// "World" carries the "highlight" class; no selection highlight remains
// cursor is still at index 6 (not moved to end)
```

<DocsPlayground :code="selectStyleUnselectCode" note="Blue = transient selection visual. Yellow = permanent highlight applied after .unselect() clears the selection state." />

### Unselect a specific cursor

```ts
tw.timeline
  .type("ABCDE", { cursor: ["a", "b"], by: "char", interval: 60 })
  .select(3, { cursor: "a" })
  .select(2, { cursor: "b" })
  .wait(600)
  .unselect({ cursor: "a" }); // only cursor "a" loses its selection

await tw.play();
// cursor "b" still has an active selection; cursor "a" does not
```

### Clear all cursors' selections at once

```ts
tw.timeline
  .type("ABCDE", { cursor: ["a", "b"], by: "char", interval: 60 })
  .select(2, { cursor: "a" })
  .select(3, { cursor: "b" })
  .wait(800)
  .unselect({ cursor: ["a", "b"] }); // both selections cleared simultaneously

await tw.play();
```

### Unselect after using selection as a style target

```ts
tw.timeline
  .type("Status: pending", { by: "char", interval: 60 })
  .wait(400)
  .move(-7)
  .select(7)                               // selects "pending" (indices 8–15)
  .unstyle("selection")                    // removes styles from "pending"; selection cleared
  .style("status-done", { from: 8, to: 15 }) // apply new style using absolute range
  .unselect()                              // dismiss the selection if still active; cursor stays
  .move("end");                            // continue from the end

await tw.play();
```

## Comparison with other commands that clear the selection

| Command | Clears selection? | Moves cursor? | Mutates document? |
|---|---|---|---|
| `.type()` | Yes | Yes (advances past inserted text) | Yes |
| `.delete()` | Yes | Yes (backward) or no (forward) | Yes |
| `.move()` | Yes | Yes | No |
| `.unselect()` | Yes | No | No |
| `.select()` | Replaces | No | No |

## Edge cases

- **No active selection** - `.unselect()` is a no-op; state is returned unchanged.
- **Unknown cursor ID** - the event is compiled for that cursor ID; if no such cursor exists in state at playback time, the event is a no-op.
- **Called before `.select()`** - no effect; there is nothing to clear.

## Type reference

- [`TUnselectOptions`](/api/type-aliases/TUnselectOptions)
- [`TUnselectCommand`](/api/type-aliases/TUnselectCommand)
- [`TSelectionState`](/api/type-aliases/TSelectionState)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
