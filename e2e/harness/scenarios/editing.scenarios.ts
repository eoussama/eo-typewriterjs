import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const EDITING_SCENARIOS: readonly TScenario[] = [
  {
    id: "delete-chars",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .delete(6, { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "insert-in-middle",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("world", { by: "char", interval: 1 })
        .move(0)
        .type("Hello ", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-by-word",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("one two three", { by: "char", interval: 1 })
        .delete(1, { by: "word", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-and-retype",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .delete(5, { by: "char", interval: 1 })
        .type("World", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-default-mode",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("Hi");
      await tw.play();
    },
  },
  {
    id: "delete-default-mode",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello")
        .delete(3);
      await tw.play();
    },
  },
  {
    id: "select-and-clear",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .move(0)
        .select(3)
        .unselect();
      await tw.play();
    },
  },
  {
    id: "select-style-and-unstyle",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .style("tw-bold", { from: 0, to: 5 })
        .unstyle({ from: 0, to: 5 });
      await tw.play();
    },
  },
  {
    id: "delete-exceeds-length",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hi", { by: "char", interval: 1 })
        .delete(100, { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-then-select-and-retype",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .move(5)
        .select(-5)
        .style("tw-sel", "selection")
        .type("Hi", { by: "char", interval: 1 });
      await tw.play();
    },
  },
];
