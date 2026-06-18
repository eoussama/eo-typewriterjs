/**
 * @description
 * Sample selection strategy used when a voice has multiple samples
 */
export const EAudioStrategy = {
  /**
   * @description
   * Pick a sample at random on every play
   */
  RANDOM: "random",

  /**
   * @description
   * Cycle through samples in order, looping back to the first after the last
   */
  ROUND_ROBIN: "roundRobin",

  /**
   * @description
   * Shuffle all samples into a bag and drain it before re-shuffling.
   * Avoids repetitive streaks that plain random can produce.
   */
  SHUFFLE_BAG: "shuffleBag",
} as const;

export type TAudioStrategy = (typeof EAudioStrategy)[keyof typeof EAudioStrategy];
