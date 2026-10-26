import type { TScenario } from "../scenario.type";

import { createTypewriter, domRenderer, EPlaybackStatus, stringRenderer } from "@eo-typewriterjs";



/**
 * @description
 * Classify a sound by the playback rate of its channel's default variance
 *
 * @param rate - The playback rate the sound was played at
 * @returns The channel the rate belongs to
 */
function channelOf(rate: number): string {
  if (rate < 0.85) {
    return "delete";
  }

  return rate > 1.2 ? "move" : "typing";
}

export const REGRESSION_SCENARIOS: readonly TScenario[] = [
  {
    id: "audio-channels",
    async run({ el, log }) {
      const played: string[] = [];

      // Stub the browser's Audio so the test hears which channel each sound used.
      /**
       *
       */
      (window as unknown as { Audio: unknown }).Audio = class {
        volume = 1;
        playbackRate = 1;
        preservesPitch = true;

        play(): Promise<void> {
          played.push(`${channelOf(this.playbackRate)}:${this.preservesPitch}`);

          return Promise.resolve();
        }
      };

      const tw = createTypewriter({ renderer: domRenderer(el), audio: { sfxs: { key: { samples: ["key.mp3"] } } } });

      tw.timeline
        .type("ab", { interval: 1 })
        .move(-1, { interval: 1 })
        .delete(1, { interval: 1 })
        .select(-1)
        .wait(1);
      await tw.play();

      log(played.join(","));
    },
  },
  {
    id: "grapheme-delete",
    async run({ el }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("a👨‍👩‍👧🇲🇦", { interval: 1 })
        .delete(-2, { interval: 1 });
      await tw.play();
    },
  },
  {
    id: "string-renderer",
    async run({ el, log }) {
      const renderer = stringRenderer();
      const tw = createTypewriter({ renderer });

      tw.timeline.type("Hello", { interval: 1, style: { ansi: { bold: "1" } } });
      await tw.play();

      el.textContent = renderer.toString();
      log(JSON.stringify(renderer.toAnsiString()));
    },
  },
  {
    id: "hook-error",
    async run({ el, log, setStatus }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline
        .type("ab", { interval: 1 })
        .call(() => {
          throw new Error("hook failed");
        })
        .type("c", { interval: 1 });

      try {
        await tw.play();
      }
      catch (error) {
        log((error as Error).message);
      }

      setStatus(tw.getState().status);
    },
  },
  {
    id: "pause-resume-hooks",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("abcd", {
        interval: 40,
        after: ({ stepIndex }) => {
          log(`after:${stepIndex}`);
        },
      });

      const first = tw.play();

      await new Promise(resolve => setTimeout(resolve, 60));
      tw.pause();
      await first;
      await tw.play();
    },
  },
  {
    id: "cursor-change-survives-replay",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.timeline.type("ab", { interval: 1 });
      tw.setCursorVisible(false);
      await tw.play();
      await tw.replay();

      log(`cursors:${el.querySelectorAll(".typewriter-cursor").length}`);
      log(`status:${tw.getState().status === EPlaybackStatus.COMPLETED}`);
    },
  },
  {
    id: "empty-document-cursor",
    async run({ el, log }) {
      const tw = createTypewriter({ renderer: domRenderer(el) });

      tw.seek(0);

      log(`cursors:${el.querySelectorAll(".typewriter-cursor").length}`);
    },
  },
];
