---
layout: home

hero:
  name: "EO TypewriterJS"
  text: "Cinematic typewriter animation engine"
  tagline: "Compose rich text playback scenes with a chainable timeline, live editing commands, full Unicode support, and a renderer-agnostic architecture that works in the browser and on the server."
  image:
    src: /logo.svg
    alt: EO TypewriterJS Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: "Sandbox ↗\uFE0E"
      link: https://eoussama.github.io/eo-typewriterjs/sandbox/
      target: _blank

features:
  - icon: 🎬
    title: Compose scenes, not strings
    details: Chain type, delete, wait, move, select, style, and call into one declarative timeline. Complex sequences in a few lines.
  - icon: ✂️
    title: Edit live during playback
    details: Move the cursor, select ranges, apply styles, and delete text while the animation runs. The document rewrites itself as it plays.
  - icon: 🌐
    title: Unicode that just works
    details: Emoji, accented characters, RTL text, and grapheme clusters all behave correctly. Type by character, word, line, or custom chunk, no broken glyphs.
  - icon: 🎯
    title: Render anywhere
    details: Built-in DOM and string renderers out of the box. Implement IRenderer to target a canvas, a terminal, a stream, or anything else.
  - icon: ⏯️
    title: Full playback control
    details: Play, pause, stop, and replay from any point. Per-command callbacks let you react to each step and drive interactive flows.
  - icon: 🔷
    title: TypeScript-first
    details: Every command, event, and renderer contract is fully typed and exported. The entire API surface is covered, no any, no surprises.
  - icon: ⚡
    title: Lightweight by design
    details: Pure ESM, no heavy runtime. A minimal event loop keeps animations smooth without blocking the main thread.
  - icon: 🔊
    title: Built-in audio engine
    details: Attach sound effects to typing, deletion, and custom commands. Configure voice packs and per-channel volume for an audible layer.
  - icon: 🧪
    title: Tested end to end
    details: Vitest unit tests and a full Playwright browser harness cover reducers, renderers, cursor movement, styling, editing, and callbacks.
---
