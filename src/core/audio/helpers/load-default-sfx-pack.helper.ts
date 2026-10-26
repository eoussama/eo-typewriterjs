import type { TAudioSfxPack } from "../types/audio-sfx.type";



/**
 * @description
 * The pending or settled load of the built-in sfx pack, shared by every audio manager
 */
let loading: Promise<TAudioSfxPack> | null = null;

/**
 * @description
 * The built-in sfx pack once it has loaded
 */
let loaded: TAudioSfxPack | null = null;

/**
 * @description
 * Load the built-in sfx pack. It lives in its own chunk so that typewriters without
 * audio never download its samples. Repeated calls share a single load.
 *
 * @returns A promise resolving to the built-in sfx pack
 */
export function loadDefaultSfxPack(): Promise<TAudioSfxPack> {
  loading ??= import("../consts/default-sfx-pack.const").then((module) => {
    loaded = module.DEFAULT_SFX_PACK;

    return loaded;
  });

  return loading;
}

/**
 * @description
 * Return the built-in sfx pack if it has finished loading
 *
 * @returns The built-in sfx pack, or null while it is still loading or was never requested
 */
export function getLoadedDefaultSfxPack(): TAudioSfxPack | null {
  return loaded;
}
