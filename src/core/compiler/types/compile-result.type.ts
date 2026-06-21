import type { TBaseEvent } from "../../events/types/base-event.type";



/**
 * @description
 * The result shape returned by every compile helper.
 * Contains the produced events and the end time after the last emitted event.
 */
export type TCompileResult<TEvent extends TBaseEvent> = {
  readonly events: TEvent[];
  readonly endTime: number;
};
