# Configuration

All configuration is passed to `createTypewriter(options)`. This page covers every option and its default value.

## `createTypewriter(options)`

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: { kind: "pipe", animation: "blink" },
  audio: { enabled: false },
});
```

### `renderer` (required)

An object implementing [`IRenderer`](/api/interfaces/IRenderer). The two built-in factories are `domRenderer(target)` and `stringRenderer()`. See [Renderers](/guide/renderers) for details.

```ts
import { domRenderer, stringRenderer } from "eo-typewriterjs";

// browser
const tw = createTypewriter({ renderer: domRenderer("#output") });

// server / test
const tw = createTypewriter({ renderer: stringRenderer() });
```

### `cursor`

Controls the appearance and initial state of the `"main"` cursor.

| Field | Type | Default | Description |
|---|---|---|---|
| `kind` | `TCursorKind` | `"pipe"` | Cursor shape. See [cursor kinds](#cursor-kinds) below. |
| `content` | `string \| undefined` | _(kind default)_ | Custom glyph string; overrides the kind's default character. |
| `animation` | `"blink" \| "none" \| "custom"` | `"blink"` | Built-in CSS animation on the cursor `<span>`. |
| `visible` | `boolean` | `true` | Whether the cursor is visible on mount. |

```ts
import { createTypewriter, domRenderer, ECursorKind } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: {
    kind: ECursorKind.BLOCK,
    animation: "blink",
    visible: true,
  },
});
```

#### Cursor kinds

| Kind constant | String value | Default glyph |
|---|---|---|
| `ECursorKind.PIPE` | `"pipe"` | `\|` |
| `ECursorKind.UNDERSCORE` | `"underscore"` | `_` |
| `ECursorKind.BLOCK` | `"block"` | `▋` |
| `ECursorKind.BLOCK_UNDERSCORE` | `"block-underscore"` | `▄` |
| `ECursorKind.CARET` | `"caret"` | `^` |
| `ECursorKind.CUSTOM` | `"custom"` | _(empty)_ |

Pass `content: ""` to create a CSS-only cursor with no rendered glyph, controlled entirely via CSS on `.typewriter-cursor`.

#### Changing cursor options at runtime

```ts
tw.setCursorOptions({ kind: ECursorKind.UNDERSCORE }); // all cursors
tw.setCursorVisible(false);                             // hide all cursors
tw.setCursorVisible(true, "main");                      // show a specific cursor
```

These take effect immediately without stopping playback.

### `audio`

Controls the built-in audio engine. All fields are optional; audio is **disabled by default**.

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Master switch. |
| `volume` | `number` | `1` | Master volume, clamped to `[0, 1]`. |
| `strategy` | `TAudioStrategy` | `EAudioStrategy.ROUND_ROBIN` | How samples are picked when a sound fires. |
| `sfxs` | `Record<string, TAudioSfx>` | `undefined` | Named sound effect sets. Each entry has a `samples` array of URLs and an optional per-sfx `strategy`. When omitted, the audio engine falls back to the built-in keyboard-click samples internally. |
| `typing` | `TAudioChannelOptions` | _(uses `sfxs.typing`)_ | Channel config for type events. |
| `deleting` | `TAudioChannelOptions` | _(uses `sfxs.deleting`)_ | Channel config for delete events. |

```ts
import { createTypewriter, domRenderer, EAudioStrategy } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    enabled: true,
    volume: 0.7,
    sfxs: {
      key: { samples: ["/sounds/key1.mp3", "/sounds/key2.mp3"] },
    },
    typing: { sfx: "key", strategy: EAudioStrategy.SHUFFLE_BAG },
  },
});
```

#### Audio strategies

| Constant | Value | Behavior |
|---|---|---|
| `EAudioStrategy.ROUND_ROBIN` | `"roundRobin"` | Cycles through samples in order. |
| `EAudioStrategy.RANDOM` | `"random"` | Picks a random sample each time. |
| `EAudioStrategy.SHUFFLE_BAG` | `"shuffleBag"` | Shuffles all samples, then cycles; reshuffles when exhausted. |

#### Built-in SFX pack

The library ships a built-in pack of three keyboard-click samples. It is used automatically at runtime when `sfxs` is not provided. To reference or extend it in your own code, import it from the subpath entry:

```ts
import { DEFAULT_SFX_PACK } from "eo-typewriterjs/audio-pack";

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    enabled: true,
    sfxs: {
      ...DEFAULT_SFX_PACK,
      mykey: { samples: ["/sounds/custom.mp3"] },
    },
  },
});
```

The pack is code-split from the main bundle so consumers who do not use audio do not pay the byte cost.

#### Changing audio options at runtime

```ts
tw.setAudioEnabled(false);         // mute without stopping playback
tw.setAudioEnabled(true);          // unmute
tw.setAudioVolume(0.5);            // master volume [0, 1]
tw.setAudioOptions({ volume: 0.3 }); // partial or full replacement
tw.getAudioOptions();              // read current config snapshot
```

#### Per-command audio override

Each command accepts an `audio` option that overrides the global config for that command only:

```ts
tw.timeline
  .type("Audible line", { interval: 80 })
  .type("Silent line",  { interval: 80, audio: false })
  .type("Louder line",  { interval: 80, audio: { volume: 1 } });
```

## Runtime controls reference

The `TTypewriter` object returned by `createTypewriter()` exposes these methods:

| Method | Returns | Description |
|---|---|---|
| `play()` | `Promise<void>` | Start or resume. Resolves when all commands finish. |
| `pause()` | `void` | Pause at the current position. |
| `stop()` | `void` | Stop and reset to blank state. |
| `cancel()` | `void` | Stop and keep the current output on screen. |
| `replay()` | `Promise<void>` | Restart from the beginning. |
| `seek(ms)` | `void` | Jump to an absolute millisecond position. |
| `stepForward()` | `void` | Apply the next event group and pause. |
| `stepBackward()` | `void` | Undo the last event group and pause. |
| `setRate(n)` | `void` | Set playback speed multiplier (e.g. `2` for double speed). |
| `getState()` | `TPlaybackState` | Current playback metadata: `status`, `currentTime`, `duration`, `rate`. |
| `getLiveState()` | `TTypewriterState` | Current document, cursor positions, and selections. |
| `setCursorVisible(visible, id?)` | `void` | Show or hide a cursor (all cursors if no ID given). |
| `setCursorOptions(opts)` | `void` | Update cursor appearance for all cursors. |
| `setAudioEnabled(enabled)` | `void` | Toggle audio without stopping playback. |
| `setAudioVolume(volume)` | `void` | Set master volume `[0, 1]`. |
| `setAudioOptions(opts)` | `void` | Replace audio configuration. |
| `getAudioOptions()` | `TAudioOptions` | Read current audio configuration. |

## Full example

```ts
import { createTypewriter, domRenderer, ECursorKind, EAudioStrategy } from "eo-typewriterjs";

const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: {
    kind: ECursorKind.PIPE,
    animation: "blink",
    visible: true,
  },
  audio: {
    enabled: true,
    volume: 0.6,
    typing: { strategy: EAudioStrategy.SHUFFLE_BAG },
  },
});

tw.timeline
  .type("Configuration demo", { by: "char", interval: 70 })
  .wait(500)
  .delete(-4, { by: "char", interval: 40 })
  .type("reference.", { by: "char", interval: 70 });

await tw.play();
```

## Type reference

- [`createTypewriter`](/api/functions/createTypewriter)
- [`TTypewriterOptions`](/api/type-aliases/TTypewriterOptions)
- [`TAudioOptions`](/api/type-aliases/TAudioOptions)
- [`TAudioChannelOptions`](/api/type-aliases/TAudioChannelOptions)
- [`EAudioStrategy`](/api/variables/EAudioStrategy)
- [`ECursorKind`](/api/variables/ECursorKind)
- [`IRenderer`](/api/interfaces/IRenderer)
