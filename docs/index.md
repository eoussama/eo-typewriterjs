---
layout: home

hero:
  name: "EO TypewriterJS"
  text: "Cinematic typewriter animation engine"
  tagline: "Compose rich text playback scenes with a chainable timeline, live editing commands, full Unicode support, and a renderer-agnostic architecture that works in the browser and on the server."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: Sandbox
      link: /sandbox
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
    details: Handle Unicode text safely, including emoji, combining marks, grapheme clusters, and RTL content. Type by character, word, line, or custom chunk without broken grapheme stepping.
  - icon: 🎯
    title: Render anywhere
    details: Built-in DOM and string renderers out of the box. Implement IRenderer to target a canvas, a terminal, a stream, or anything else.
  - icon: ⏯️
    title: Full playback control
    details: Play, pause, stop, replay, seek, and step through playback. Hooks and callbacks let you react to timed steps and orchestrate interactive flows.
  - icon: 🔷
    title: TypeScript-first
    details: Commands, events, renderers, styles, and playback controls are strongly typed and exported for first-class TypeScript workflows.
  - icon: ⚡
    title: Lightweight by design
    details: Lean playback core with minimal overhead and no renderer lock-in. Keep animations responsive while targeting the DOM, strings, or any custom output.
  - icon: 🔊
    title: Built-in audio engine
    details: Opt-in typing sounds where typing, deleting and moving the cursor each sound different, with configurable samples, strategies and per-command overrides. The samples load only when you turn sound on.
  - icon: 🧪
    title: Tested end to end
    details: Every line of the library is covered by unit tests and checked by mutation testing, and Playwright plays every playback scenario, docs example and sandbox recipe in a real browser.
---
