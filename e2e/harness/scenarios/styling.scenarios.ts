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
        .move(-5)
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
        .move(-5)
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
  {
    id: "cumulative-styles-same-range",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { content: "" } });

      tw.timeline
        .type("Important Notice", { by: "char", interval: 1 })
        .style("tw-bold", { from: 0, to: 9 })
        .style("tw-underline", { from: 0, to: 9 });
      await tw.play();
    },
  },
  {
    id: "inline-style-coalescing",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { content: "" } });

      tw.timeline
        .type("Hello ", { by: "char", interval: 1, style: "tw-greeting" })
        .type("World!", { by: "char", interval: 1, style: "tw-accent" });
      await tw.play();
    },
  },
  {
    id: "animated-select-grows",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el), cursor: { content: "" } });

      tw.timeline
        .type("Status: pending", { by: "char", interval: 1 })
        .select(-7, { by: "char", interval: 50 });
      await tw.play();
    },
  },
];
