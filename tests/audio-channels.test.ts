import type { TAudioOptions } from "../src/index";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioManagerHelper } from "../src/core/audio/helpers/audio-manager.helper";
import { createTypewriter, stringRenderer } from "../src/index";



type TPlayed = {
  readonly src: string;
  volume: number;
  playbackRate: number;
  preservesPitch: boolean;
};

let played: TPlayed[] = [];

beforeEach(() => {
  played = [];

  vi.stubGlobal("Audio", class {
    volume = 1;
    playbackRate = 1;
    preservesPitch = true;

    constructor(readonly src: string) {
      played.push(this);
    }

    play(): Promise<void> {
      return Promise.resolve();
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * @description
 * Play one sound on each channel with Math.random pinned to a value
 *
 * @param random - The value Math.random returns
 * @param options - The audio options
 * @returns The recorded typing, delete and move sounds
 */
function playEach(random: number, options: TAudioOptions = {}): TPlayed[] {
  vi.spyOn(Math, "random").mockReturnValue(random);

  const manager = new AudioManagerHelper({ sfxs: { key: { samples: ["key.mp3"] } }, ...options });

  manager.playTyping();
  manager.playDelete();
  manager.playMove();

  return played;
}

describe("audio channels", () => {
  it("pitch typing around 1, delete lower and move higher and quieter", () => {
    const [typingLow, deleteLow, moveLow] = playEach(0);

    expect([typingLow?.playbackRate, deleteLow?.playbackRate, moveLow?.playbackRate]).toEqual([0.92, 0.72, 1.3]);
    expect([typingLow?.volume, deleteLow?.volume, moveLow?.volume]).toEqual([0.85, 0.8, 0.4]);

    played = [];

    const [typingHigh, deleteHigh, moveHigh] = playEach(0.999_999);

    expect(typingHigh!.playbackRate).toBeCloseTo(1.08);
    expect(deleteHigh!.playbackRate).toBeCloseTo(0.82);
    expect(moveHigh!.playbackRate).toBeCloseTo(1.45);
    expect(moveHigh!.volume).toBeCloseTo(0.55);
  });

  it("lets the rate shift the pitch", () => {
    expect(playEach(0.5).every(sound => !sound.preservesPitch)).toBe(true);
  });

  it("uses a channel's own variance over the defaults", () => {
    const [, removal] = playEach(0, { delete: { playbackRateJitter: { min: 2, max: 2 }, volumeJitter: { min: 0.1, max: 0.1 } } });

    expect(removal).toMatchObject({ playbackRate: 2, volume: 0.1 });
  });

  it("makes delete and move inherit typing's sample selection but not its variance", () => {
    const [typing, removal, movement] = playEach(0, {
      sfxs: { soft: { samples: ["soft.mp3"] }, loud: { samples: ["loud.mp3"] } },
      typing: { sfx: "soft", playbackRateJitter: { min: 3, max: 3 } },
      move: { sfx: "loud" },
    });

    expect(typing).toMatchObject({ src: "soft.mp3", playbackRate: 3 });
    expect(removal).toMatchObject({ src: "soft.mp3", playbackRate: 0.72 });
    expect(movement).toMatchObject({ src: "loud.mp3", playbackRate: 1.3 });
  });

  it("disables jitter when a channel clears it", () => {
    const [typing] = playEach(0.5, { typing: { playbackRateJitter: undefined, volumeJitter: undefined } });

    expect(typing).toMatchObject({ playbackRate: 1, volume: 1 });
  });

  it("silences a channel with a false override", () => {
    const manager = new AudioManagerHelper({ sfxs: { key: { samples: ["key.mp3"] } } });

    manager.playMove(false);

    expect(played).toHaveLength(0);
  });

  it("plays a move sound only when the cursor actually moves", async () => {
    vi.useFakeTimers();

    const tw = createTypewriter({ renderer: stringRenderer(), audio: { sfxs: { key: { samples: ["key.mp3"] } }, move: { volumeJitter: { min: 0.2, max: 0.2 } } } });

    tw.timeline.type("ab", { interval: 0 }).move(-5, { interval: 0 }).select(1, { interval: 0 }).wait(1);

    const done = tw.play();

    await vi.runAllTimersAsync();
    await done;
    vi.useRealTimers();

    expect(played.map(sound => sound.volume === 0.2 ? "move" : "type")).toEqual(["type", "type", "move", "move"]);
  });
});
