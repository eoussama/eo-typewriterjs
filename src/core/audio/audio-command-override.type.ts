/**
 * @description
 * Per-command audio override.
 * Set to `false` to silence audio for this specific command.
 * Set to an object to use a specific voice or volume for this command.
 */
export type TAudioCommandOverride
  = | false
    | {
    /**
     * @description
     * Name of a single voice from the voice pack to use for this command.
     * Takes priority over the channel default.
     */
      readonly voice?: string;

      /**
       * @description
       * Subset of voice names to select from for this command.
       * When provided, the audio manager picks from only these voices.
       * Takes priority over `voice` when both are set.
       */
      readonly voices?: readonly string[];

      /**
       * @description
       * Per-command volume override in the range [0, 1].
       * Multiplied against the master volume.
       */
      readonly volume?: number;
    };
