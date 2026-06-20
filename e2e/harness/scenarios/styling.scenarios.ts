import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer } from "@eo-typewriterjs";



export const STYLING_SCENARIOS: readonly TScenario[] = [
  {
    id: "style-after-typing",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .style("tw-highlight", { from: 0, to: 5 });
      await tw.play();
    },
  },
  {
    id: "inline-style",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Plain ", { by: "char", interval: 1 })
        .type("styled", { by: "char", interval: 1, style: "tw-accent" });
      await tw.play();
    },
  },
  {
    id: "layered-styles",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Error | Ok", { by: "char", interval: 1 })
        .style("tw-danger", { from: 0, to: 5 })
        .style("tw-success", { from: 8, to: 10 });
      await tw.play();
    },
  },
  {
    id: "selection-style",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello world", { by: "char", interval: 1 })
        .select(-5, { by: "char" })
        .style("tw-highlight", "selection");
      await tw.play();
    },
  },
  {
    id: "style-object",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Styled", { by: "char", interval: 1 })
        .style({ css: { color: "red" } }, { from: 0, to: 6 });
      await tw.play();
    },
  },
  {
    id: "unselect",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .move(6)
        .select(5)
        .unselect();
      await tw.play();
    },
  },
  {
    id: "unstyle-range",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .style("tw-highlight", { from: 0, to: 11 })
        .unstyle({ from: 6, to: 11 });
      await tw.play();
    },
  },
  {
    id: "unstyle-selection",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .style("tw-highlight", { from: 0, to: 11 })
        .move(6)
        .select(5)
        .unstyle("selection");
      await tw.play();
    },
  },
  {
    id: "unstyle-split",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("Hello World", { by: "char", interval: 1 })
        .style("tw-highlight", { from: 0, to: 11 })
        .unstyle({ from: 3, to: 8 });
      await tw.play();
    },
  },
];
