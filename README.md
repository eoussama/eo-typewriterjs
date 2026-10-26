<p align="center">
    <a href="https://eo-typewriterjs.ouss.es">
      <img src="https://raw.githubusercontent.com/eoussama/eo-typewriterjs/refs/heads/master/assets/logo.svg" alt="Logo" width="200px">
      <h1 align="center">eo-typewriterjs</h1>
    </a>
    <p align="center">Build rich typewriter animations with a composable timeline, full Unicode support, and a renderer-agnostic architecture that works in the browser and on the server.</p>
    <p align="center">
        <img src="https://img.shields.io/npm/v/eo-typewriterjs.svg" alt="npm version">
        <img src="https://img.shields.io/npm/dm/eo-typewriterjs.svg" alt="npm downloads">
        <img src="https://img.shields.io/github/actions/workflow/status/eoussama/eo-typewriterjs/ci.yml?branch=master&label=CI" alt="CI status">
        <img src="https://img.shields.io/github/license/eoussama/eo-typewriterjs.svg" alt="License">
    </p>
</p>

---

## Install

```bash
pnpm add eo-typewriterjs
```

## Why eo-typewriterjs

- **Composable timeline**: chain type, delete, wait, move, select, unselect, style, unstyle, and call commands in any order.
- **Flexible advance modes**: type by character, word, line, grapheme, or custom chunk size.
- **Rich text support**: apply styles to ranges during playback.
- **Full Unicode**: handles emoji, accented characters, and complex grapheme clusters correctly.
- **Renderer-agnostic**: built-in DOM and string renderers; implement `IRenderer` to target anything.
- **TypeScript-first**: fully typed public API with no `any`.
- **Playback controls**: play, pause, stop, replay, and cancel from any point.

## Quick start

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline
  .type("Hello, ")
  .type("world!", { by: "word", interval: 120 })
  .wait(400)
  .delete(6)
  .type("EO TypewriterJS.");

await tw.play();
```

## Documentation

Full documentation, guides, and the API reference are available on the docs site.

- [Docs site](https://eo-typewriterjs.ouss.es/)
- [Getting started](https://eo-typewriterjs.ouss.es/guide/getting-started)
- [Core concepts](https://eo-typewriterjs.ouss.es/guide/core-concepts)
- [Timeline](https://eo-typewriterjs.ouss.es/guide/timeline)
- [Renderers](https://eo-typewriterjs.ouss.es/guide/renderers)
- [Recipes](https://eo-typewriterjs.ouss.es/guide/recipes)
- [API reference](https://eo-typewriterjs.ouss.es/api/)

## Sandbox

Try the library live in the interactive [sandbox](https://eo-typewriterjs.ouss.es/sandbox), write timelines, run them, and see output in real time without any setup.

## Testing

The library is covered by two test layers:

- **Unit tests** (`pnpm test`): Vitest suite covering core logic, reducers, renderers, and edge cases.
- **End-to-end tests** (`pnpm test:e2e`): Playwright suite running real playback scenarios in a browser harness, including typing flows, waiting, multiline output, cursor movement, selection, editing, and callbacks.

## Development

```bash
pnpm dev           # rebuild the library on change
pnpm build         # build the library
pnpm typecheck     # type check with TypeScript 7
pnpm test          # run unit tests with coverage
pnpm test:smoke    # test the built package
pnpm test:e2e      # run end-to-end tests
pnpm lint          # lint
pnpm check         # run every check CI runs
pnpm docs:dev      # start the docs site and the sandbox (/sandbox)
```

## License

MIT
