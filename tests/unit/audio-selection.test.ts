import type { TAudioOptions } from "../../src/index";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioManagerHelper } from "../../src/core/audio/helpers/audio-manager.helper";



type TSound = {
  readonly src: string;
  volume: number;
  plays: number;
};

let sounds: TSound[] = [];

/**
 * @description
 * Make Math.random return the given values in order, then 0
 *
 * @param values - The values to return
 */
function queueRandom(...values: number[]): void {
  vi.spyOn(Math, "random").mockImplementation(() => values.shift() ?? 0);
}

/**
 * @description
 * Create an audio manager without jitter, so Math.random only drives sample selection
 *
 * @param options - Audio options merged over the jitter-free defaults
 * @returns The audio manager
 */
function manager(options: TAudioOptions = {}): AudioManagerHelper {
  const plain = { playbackRateJitter: undefined, volumeJitter: undefined };

  return new AudioManagerHelper({
    sfxs: { a: { samples: ["a"] }, b: { samples: ["b"] }, c: { samples: ["c"] } },
    ...options,
    typing: { ...plain, ...options.typing },
  });
}

/**
 * @description
 * Play typing sounds and return the sources heard
 *
 * @param audio - The audio manager
 * @param count - How many sounds to play
 * @returns The played sources
 */
function playTyping(audio: AudioManagerHelper, count: number): string[] {
  for (let i = 0; i < count; i++) {
    audio.playTyping();
  }

  return sounds.map(sound => sound.src);
}

beforeEach(() => {
  sounds = [];

  vi.stubGlobal("Audio", class {
    readonly sound: TSound;
    playbackRate = 1;
    preservesPitch = true;

    constructor(src: string) {
      this.sound = { src, volume: 1, plays: 0 };
      sounds.push(this.sound);
    }

    set volume(value: number) {
      this.sound.volume = value;
    }

    get volume(): number {
      return this.sound.volume;
    }

    play(): Promise<void> {
      this.sound.plays++;

      return Promise.reject(new Error("NotAllowedError"));
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("shuffle bag", () => {
  it("plays every sample once per round in shuffled order", () => {
    queueRandom(0, 0, 0, 0);

    // Fisher-Yates with random 0 turns [a, b, c] into [b, c, a].
    expect(playTyping(manager(), 6)).toEqual(["b", "c", "a", "b", "c", "a"]);
  });

  it("swaps the first sample of a new round when it repeats the last one", () => {
    queueRandom(0.99, 0.99, 0, 0.99, 0);

    expect(playTyping(manager(), 6)).toEqual(["a", "b", "c", "b", "c", "a"]);
  });

  it("swaps the repeated sample with any later one in the new round", () => {
    queueRandom(0.99, 0.99, 0, 0.99, 0.99);

    expect(playTyping(manager(), 6)).toEqual(["a", "b", "c", "a", "b", "c"]);
  });

  it("allows a repeat across rounds when avoidImmediateRepeat is off", () => {
    queueRandom(0.99, 0.99, 0, 0.99);

    expect(playTyping(manager({ typing: { avoidImmediateRepeat: false } }), 6)).toEqual(["a", "b", "c", "c", "b", "a"]);
  });

  it("keeps repeating a single-sample pool", () => {
    expect(playTyping(manager({ typing: { sfx: "a" } }), 3)).toEqual(["a", "a", "a"]);
  });
});

describe("round robin", () => {
  it("cycles through the samples in order", () => {
    expect(playTyping(manager({ typing: { strategy: "roundRobin" } }), 4)).toEqual(["a", "b", "c", "a"]);
  });

  it("keeps a separate position for every sample pool", () => {
    const audio = manager({
      sfxs: { a: { samples: ["a1", "a2"] }, b: { samples: ["b1"] }, ab: { samples: ["p", "q"] } },
      typing: { strategy: "roundRobin" },
    });

    audio.playTyping({ sfxs: ["a", "b"] });
    audio.playTyping({ sfxs: ["ab"] });

    expect(sounds.map(sound => sound.src)).toEqual(["a1", "p"]);
  });

  it("restarts after the options are replaced", () => {
    const audio = manager({ typing: { strategy: "roundRobin" } });

    playTyping(audio, 2);
    audio.setOptions({ sfxs: { a: { samples: ["a"] }, b: { samples: ["b"] } }, typing: { strategy: "roundRobin" } });

    expect(playTyping(audio, 1)).toEqual(["a", "b", "a"]);
  });
});

describe("random", () => {
  it("never repeats the previous sample by default", () => {
    queueRandom(0, 0, 0, 0);

    expect(playTyping(manager({ typing: { strategy: "random" } }), 4)).toEqual(["a", "b", "a", "b"]);
  });

  it("can repeat when avoidImmediateRepeat is off", () => {
    queueRandom(0.5, 0.5, 0.99);

    expect(playTyping(manager({ typing: { strategy: "random", avoidImmediateRepeat: false } }), 3)).toEqual(["b", "b", "c"]);
  });

  it("falls back to the whole pool when every sample is the last one", () => {
    expect(playTyping(manager({ sfxs: { x: { samples: ["same"] }, y: { samples: ["same"] } }, typing: { strategy: "random" } }), 2)).toEqual(["same", "same"]);
  });

  it("scales the pick by the pool size", () => {
    queueRandom(0.7, 0.7);

    expect(playTyping(manager({ typing: { strategy: "random" } }), 2)).toEqual(["c", "b"]);
  });
});

describe("sfx precedence", () => {
  const pack = { a: { samples: ["a"] }, b: { samples: ["b"] }, c: { samples: ["c"] }, d: { samples: ["d"] } };

  it.each([
    ["command sfxs", { sfxs: ["a"], sfx: "b" }, { sfxs: ["c"], sfx: "d" }, "a"],
    ["command sfx when command sfxs is empty", { sfxs: [], sfx: "b" }, { sfxs: ["c"], sfx: "d" }, "b"],
    ["command sfx over channel sfxs", { sfx: "b" }, { sfxs: ["c"], sfx: "d" }, "b"],
    ["channel sfxs over channel sfx", {}, { sfxs: ["c"], sfx: "d" }, "c"],
    ["channel sfx when channel sfxs is empty", {}, { sfxs: [], sfx: "d" }, "d"],
    ["known names only", {}, { sfxs: ["missing", "c"] }, "c"],
  ] as const)("uses %s", (_name, override, typing, expected) => {
    manager({ sfxs: pack, typing }).playTyping(override);

    expect(sounds.map(sound => sound.src)).toEqual([expected]);
  });

  it("draws from every sfx when nothing is selected", () => {
    expect(playTyping(manager({ sfxs: pack, typing: { strategy: "roundRobin" } }), 4)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("volume and playback", () => {
  it("multiplies the master and command volumes", () => {
    manager({ volume: 0.5 }).playTyping({ volume: 0.5 });

    expect(sounds[0]?.volume).toBe(0.25);
  });

  it("clamps the volume to 1", () => {
    manager({ volume: 3 }).playTyping();

    expect(sounds[0]?.volume).toBe(1);
  });

  it("starts playback and ignores autoplay rejections", async () => {
    manager().playTyping();
    await Promise.resolve();

    expect(sounds[0]?.plays).toBe(1);
  });

  it("stays silent when disabled or overridden with false", () => {
    manager({ enabled: false }).playTyping();
    manager().playTyping(false);

    expect(sounds).toHaveLength(0);
  });
});

describe("loading the built-in pack", () => {
  afterEach(() => {
    vi.doUnmock("../../src/core/audio/helpers/load-default-sfx-pack.helper");
    vi.resetModules();
  });

  it("only loads it when audio is enabled without custom sfxs", async () => {
    vi.resetModules();

    const load = vi.fn(async () => ({}));

    vi.doMock("../../src/core/audio/helpers/load-default-sfx-pack.helper", () => ({
      loadDefaultSfxPack: load,
      getLoadedDefaultSfxPack: () => null,
    }));

    const { AudioManagerHelper: Fresh } = await import("../../src/core/audio/helpers/audio-manager.helper");

    await new Fresh({ enabled: false }).ready();
    await new Fresh({ sfxs: {} }).ready();
    expect(load).not.toHaveBeenCalled();

    await new Fresh({}).ready();
    expect(load).toHaveBeenCalled();
  });
});
