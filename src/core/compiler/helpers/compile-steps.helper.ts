import type { TAdvanceUnit } from "../../commands/types/type-command.type";
import type { TDeleteEvent } from "../../events/types/delete-event.type";
import type { TMoveEvent } from "../../events/types/move-event.type";
import type { TSelectEvent } from "../../events/types/select-event.type";
import type { TTimelineEvent } from "../../events/types/timeline-event.type";
import type { TTypewriterState } from "../../state/types/typewriter-state.type";
import type { TCommand } from "../types/command.type";
import type { TPlaybackProgram, TPlaybackSound, TPlaybackStep } from "../types/playback-step.type";

import { ECommandKind } from "../../commands/enums/command-kind.enum";
import { reduce } from "../../reducer/helpers/reduce.helper";
import { createInitialState } from "../../state/helpers/typewriter-state.helper";
import { DEFAULT_INTERVAL } from "../consts/compiler.const";
import { compileCommand } from "./compile.helper";
import { resolveMotionAdvanceMode, resolveTypeAdvanceMode } from "./resolve-advance-mode.helper";



/**
 * @description
 * Events emitted by the motion commands: move, select and delete
 */
type TMotionEvent = TMoveEvent | TSelectEvent | TDeleteEvent;

/**
 * @description
 * Commands whose steps can stall at a document boundary
 */
type TMotionCommand = Extract<TCommand, { readonly kind: "move" | "select" | "delete" }>;

/**
 * @description
 * Whether a command is a move, select or delete
 *
 * @param command - The command to check
 * @returns True for motion commands
 */
function isMotion(command: TCommand): command is TMotionCommand {
  return command.kind === ECommandKind.MOVE || command.kind === ECommandKind.SELECT || command.kind === ECommandKind.DELETE;
}

/**
 * @description
 * Resolve the advance unit reported to hooks for a command, or null for instant commands
 *
 * @param command - The command
 * @returns The advance unit, or null
 */
function resolveUnit(command: TCommand): TAdvanceUnit | null {
  switch (command.kind) {
    case ECommandKind.TYPE:
      return resolveTypeAdvanceMode(command.by).unit;

    case ECommandKind.DELETE:
      return typeof command.count === "string" ? null : resolveMotionAdvanceMode(command.by, "delete").unit;

    case ECommandKind.MOVE:
      return typeof command.offset === "string" || command.offset === 0 ? null : resolveMotionAdvanceMode(command.by, "move").unit;

    case ECommandKind.SELECT:
      return typeof command.count === "string" || command.count === 0 ? null : resolveMotionAdvanceMode(command.by, "select").unit;

    default:
      return null;
  }
}

/**
 * @description
 * Resolve the sound cue of a command. Typing, deleting and moving make sound by default;
 * other commands only do when they set an explicit `audio` override.
 *
 * @param command - The command
 * @returns The sound cue, or null for silence
 */
function resolveSound(command: TCommand): TPlaybackSound | null {
  switch (command.kind) {
    case ECommandKind.TYPE:

    case ECommandKind.MOVE:
      return "typing";

    case ECommandKind.DELETE:
      return "delete";

    default:
      return typeof command.audio === "object" ? "typing" : null;
  }
}

/**
 * @description
 * Group a command's events into steps. Compile helpers emit each cursor's events in
 * step order, so the n-th event of every cursor belongs to step n. Grouping by
 * position rather than time keeps zero-interval steps apart.
 *
 * @param events - The command's compiled events
 * @returns The time and events of each step, in order
 */
function groupSteps(events: readonly TTimelineEvent[]): [number, TTimelineEvent[]][] {
  const groups: [number, TTimelineEvent[]][] = [];
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = "cursorId" in event ? event.cursorId : "";
    const index = counts.get(key) ?? 0;

    counts.set(key, index + 1);

    if (groups[index] === undefined) {
      groups[index] = [event.time, [event]];
    }
    else {
      groups[index][1].push(event);
    }
  }

  return groups;
}

/**
 * @description
 * Whether applying a group of events changed the text, or a targeted cursor's index or selection
 *
 * @param prev - The state before the events
 * @param next - The state after the events
 * @param events - The applied events
 * @returns True when the events had an effect
 */
function hasEffect(prev: TTypewriterState, next: TTypewriterState, events: readonly TMotionEvent[]): boolean {
  if (prev.document.text !== next.document.text) {
    return true;
  }

  return events.some((event) => {
    const before = prev.selections[event.cursorId];
    const after = next.selections[event.cursorId];

    return prev.cursors[event.cursorId]?.index !== next.cursors[event.cursorId]?.index
      || before?.from !== after?.from
      || before?.to !== after?.to;
  });
}

/**
 * @description
 * Compile an ordered list of commands into playback steps.
 * Commands run back to back: each starts when the previous one ends.
 *
 * The document is simulated while compiling. Once a step of a move, select or delete
 * command has no effect (the cursor hit a boundary), the command's remaining steps
 * are dropped and take no time, so `move(999)` on short text does not idle.
 *
 * @param commands - The ordered command list from the timeline builder
 * @param initialState - The state playback starts from
 * @returns The playback steps and the total duration (the time of the last step)
 */
export function compileSteps(commands: readonly TCommand[], initialState: TTypewriterState = createInitialState()): TPlaybackProgram {
  const steps: TPlaybackStep[] = [];
  let state = initialState;
  let time = 0;

  for (const command of commands) {
    const unit = resolveUnit(command);
    const sound = resolveSound(command);
    const step = (at: number, overrides: Partial<TPlaybackStep>): TPlaybackStep => ({
      time: at,
      command,
      stepIndex: 0,
      stepCount: 1,
      unit,
      events: [],
      before: true,
      after: true,
      call: false,
      sound,
      ...overrides,
    });

    if (command.kind === ECommandKind.WAIT) {
      steps.push(step(time, { after: false }));
      time += command.duration;
      steps.push(step(time, { before: false }));
      continue;
    }

    if (command.kind === ECommandKind.CALL) {
      steps.push(step(time, { call: true }));
      continue;
    }

    const { events, endTime } = compileCommand(command, time);
    const groups = groupSteps(events);
    const motion = isMotion(command) ? command : null;
    let kept = groups.length;

    for (const [index, [, group]] of groups.entries()) {
      const next = group.reduce(reduce, state);
      const stalled = motion !== null && !hasEffect(state, next, group as TMotionEvent[]);

      state = next;

      if (stalled) {
        kept = index + 1;
        break;
      }
    }

    if (groups.length === 0) {
      steps.push(step(time, {}));
    }

    for (const [index, [at, group]] of groups.slice(0, kept).entries()) {
      steps.push(step(at, { stepIndex: index, stepCount: kept, events: group }));
    }

    // A stalled motion command ends one interval after its last kept step.
    time = motion !== null && kept < groups.length ? groups[kept - 1]![0] + (motion.interval ?? DEFAULT_INTERVAL) : endTime;
  }

  return { steps, duration: steps.at(-1)?.time ?? 0 };
}
