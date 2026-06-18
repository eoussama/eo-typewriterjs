# `.unselect()` — remove the active text selection

Removes the active text selection from one or more cursors.

```ts
tw.timeline.unselect(options?: TUnselectOptions): TimelineBuilder
```

`.unselect()` is an **instant command**. It produces a single event per targeted cursor at the current timeline clock position and does **not** advance the clock. If the targeted cursor has no active selection the state is left unchanged.

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
| `before` | `TCallbackHook` | — | Hook fired before the selection is cleared |
| `after` | `TCallbackHook` | — | Hook fired after the selection is cleared |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- The selection for each targeted cursor is removed from the state.
- If a cursor has no active selection, that cursor is unaffected and no error is raised.
- The cursor's text position is not changed.
- Works alongside `.select()` — any selection created by `.select()` can later be dismissed explicitly with `.unselect()`.

## When to use

In most cases, a selection is cleared automatically by `.type()`, `.delete()`, or `.move()` targeting the same cursor. Use `.unselect()` when you need to remove a selection **without** mutating the document or moving the cursor — for example, after a `.style()` that already consumed the selection, or to restore a clean visual state.

## Examples

### Select then clear without moving the cursor

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(6)
  .select(5) // selects "World"
  .wait(800)
  .unselect(); // removes the selection, cursor stays at 6

await tw.play();
// "World" is no longer highlighted; cursor remains at index 6
```

### Select, style, then clear

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(6)
  .select(5)
  .style("highlight", "selection")
  .unselect(); // dismiss selection after marking

await tw.play();
// "World" carries the "highlight" class; no selection highlight remains
```

### Unselect on a specific cursor

```ts
tw.timeline
  .type("ABCDE", { by: "char", interval: 60 })
  .select(3, { cursor: "a" })
  .select(2, { cursor: "b" })
  .wait(600)
  .unselect({ cursor: "a" }); // only cursor "a"'s selection is removed

await tw.play();
```

### Clear all cursors' selections at once

```ts
tw.timeline
  .type("ABCDE", { cursor: ["a", "b"], by: "char", interval: 60 })
  .select(2, { cursor: "a" })
  .select(3, { cursor: "b" })
  .wait(600)
  .unselect({ cursor: ["a", "b"] });

await tw.play();
```

## Relationship to other commands

| Command | Clears selection? |
|---|---|
| `.type()` | Yes, on the targeted cursor |
| `.delete()` | Yes, on the targeted cursor |
| `.move()` | Yes, on the targeted cursor |
| `.unselect()` | Yes, explicitly, without other side effects |
| `.style()` with `"selection"` | Yes, after consuming the selection range |
| `.select()` | Replaces any existing selection |

## Edge cases

- **No active selection** — `.unselect()` is a no-op; the state is returned unchanged.
- **Unknown cursor** — events are compiled for the specified cursor ID but if that cursor does not exist in state at play time the event is a no-op.
- **Called before `.select()`** — no effect; there is nothing to clear.

## Type reference

- [`TUnselectOptions`](/api/type-aliases/TUnselectOptions)
- [`TUnselectCommand`](/api/type-aliases/TUnselectCommand)
- [`TSelectionState`](/api/type-aliases/TSelectionState)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
