import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const EDITING_SCENARIOS: readonly TScenario[] = [
  {
    id: "delete-chars",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .delete(-6, { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "insert-in-middle",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("world", { by: "char", interval: 1 })
        .move("start")
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
        .delete(-1, { by: "word", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-and-retype",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .delete(-5, { by: "char", interval: 1 })
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
        .delete(-3);
      await tw.play();
    },
  },
  {
    id: "select-and-clear",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello", { by: "char", interval: 1 })
        .move("start")
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
        .delete(-100, { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-then-select-and-retype",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .move(-6)
        .select(-5)
        .style("tw-sel", "selection")
        .type("Hi", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "move-start-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move("start")
        .type(">", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "move-end-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move("start")
        .move("end")
        .type("!", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-start-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move(-5)
        .delete("start");
      await tw.play();
    },
  },
  {
    id: "delete-end-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move(-5)
        .delete("end");
      await tw.play();
    },
  },
  {
    id: "delete-whole-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .delete("whole");
      await tw.play();
    },
  },
  {
    id: "select-start-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move(-5)
        .select("start");
      await tw.play();
    },
  },
  {
    id: "select-end-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move("start")
        .select("end");
      await tw.play();
    },
  },
  {
    id: "select-whole-boundary",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .select("whole");
      await tw.play();
    },
  },
  {
    id: "editing-type-by-word",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("one two three", { by: "word", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-by-line",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("line1\nline2\nline3", { by: "line", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-by-whole",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("all at once", { by: "whole", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-by-line",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("line1\nline2", { by: "char", interval: 1 })
        .delete(-1, { by: "line", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-forward-char",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .move("start")
        .delete(6, { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-forward-word",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("one two three", { by: "char", interval: 1 })
        .move("start")
        .delete(1, { by: "word", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "select-and-type-replacement",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .move(-5)
        .select(5)
        .type("TypewriterJS", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "select-and-delete",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello cruel World", { by: "char", interval: 1 })
        .move(-11)
        .select(6)
        .delete(1);
      await tw.play();
    },
  },
  {
    id: "move-by-word",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("hello world", { by: "char", interval: 1 })
        .move("start")
        .move(1, { by: "word" })
        .type("X", { by: "char", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "select-whole-then-retype",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("old text", { by: "char", interval: 1 })
        .select("whole")
        .type("new text", { by: "whole", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "type-move-select-unstyle",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .style("tw-bold", { from: 0, to: 11 })
        .move(-5)
        .select(5)
        .unstyle("selection");
      await tw.play();
    },
  },
  {
    id: "delete-by-line-single-line-forward",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Loading fffff", { by: "char", interval: 1 })
        .delete(2, { by: "line", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-by-line-single-line-backward",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Loading fffff", { by: "char", interval: 1 })
        .move("start")
        .delete(-2, { by: "line", interval: 1 });
      await tw.play();
    },
  },
  {
    id: "delete-then-type",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .delete("whole")
        .type("Fresh start", { by: "char", interval: 1 });
      await tw.play();
    },
  },
];
