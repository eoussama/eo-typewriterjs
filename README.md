<p align="center">
    <a href="http://eoussama.github.io/eo-typewriterjs">
      <img src="https://raw.githubusercontent.com/eoussama/eo-typewriterjs/6630a1df285bf367f1cda1716ff5ed1a59c6b0fd/assets/logo.svg" alt="Logo" width="200px">
      <h1 align="center">eo-typewriterjs</h1>
    </a>
    <p align="center">Advanced typewriter-style text animation utility for JavaScript, with timeline playback, cursor movement, selection, deletion, and renderer-agnostic text styling.</p>
    <p align="center">
        <img src="https://img.shields.io/github/release/EOussama/typewriterjs.svg">
        <img src="https://img.shields.io/github/downloads/EOussama/typewriterjs/latest/total.svg">
        <img src="https://img.shields.io/github/languages/code-size/EOussama/typewriterjs.svg">
        <img src="https://img.shields.io/github/license/EOussama/typewriterjs.svg">
    </p>
</p>

---

## Install

```bash
pnpm add eo-typewriterjs
```

## Quick start

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const element = document.getElementById("output");

if (element === null) {
  throw new Error("Missing #output element");
}

const typewriter = createTypewriter({
  renderer: domRenderer(element),
});

typewriter.timeline
  .type("Hello ")
  .type("world!", { style: "accent" })
  .mark("highlight", { from: 6, to: 12 });

await typewriter.play();
```

## Common commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm sandbox
pnpm docs:dev
pnpm docs:build
```

## Documentation

Full documentation is available at the [docs site](https://eoussama.github.io/eo-typewriterjs/).

- [Getting Started](https://eoussama.github.io/eo-typewriterjs/guide/getting-started)
- [Core Concepts](https://eoussama.github.io/eo-typewriterjs/guide/core-concepts)
- [Timeline & Commands](https://eoussama.github.io/eo-typewriterjs/guide/timeline)
- [Renderers](https://eoussama.github.io/eo-typewriterjs/guide/renderers)
- [Recipes](https://eoussama.github.io/eo-typewriterjs/guide/recipes)
- [API Reference](https://eoussama.github.io/eo-typewriterjs/api/)

## License

MIT
