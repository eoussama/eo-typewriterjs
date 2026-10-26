import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";



/* eslint-disable no-template-curly-in-string -- CodeMirror snippet placeholders use ${n:label} */

/**
 * @description
 * A completion that inserts a snippet with tab stops
 *
 * @param label - The label shown in the list
 * @param template - The snippet, with `${n:placeholder}` tab stops
 * @param detail - Short signature shown next to the label
 * @param info - Longer description
 * @returns The completion
 */
function snippet(label: string, template: string, detail: string, info: string): Completion {
  return snippetCompletion(template, { label, type: "method", detail, info });
}

const GLOBALS: readonly Completion[] = [
  snippet("createTypewriter", "const tw = createTypewriter({ renderer });\n\ntw.timeline.type(\"${1:Hello, world!}\");\n\nawait tw.play();", "(options) => TTypewriter", "Create a typewriter and play a first timeline."),
  { label: "renderer", type: "variable", detail: "IRenderer", info: "The main preview." },
  { label: "preview", type: "function", detail: "(label: string) => IRenderer", info: "Add a labelled preview next to the main one and return its renderer." },
  { label: "signal", type: "variable", detail: "AbortSignal", info: "Aborted when the run is stopped or replaced." },
  { label: "sleep", type: "function", detail: "(ms: number) => Promise<void>", info: "Wait without blocking; stops with the run." },
  { label: "domRenderer", type: "function", detail: "(target) => DomRenderer", info: "Render into an element or CSS selector." },
  { label: "stringRenderer", type: "function", detail: "() => StringRenderer", info: "Render to a string: renderer.toString()." },
  { label: "StringRenderer", type: "class", detail: "class", info: "Headless renderer class." },
  { label: "TimelineBuilder", type: "class", detail: "class", info: "Builds command timelines." },
  { label: "ECursorKind", type: "constant", detail: "enum", info: "Built-in cursor kinds." },
  { label: "EPlaybackStatus", type: "constant", detail: "enum", info: "Playback statuses." },
  { label: "ECommandKind", type: "constant", detail: "enum", info: "Command kinds." },
  { label: "EAudioStrategy", type: "constant", detail: "enum", info: "Sample selection strategies." },
  { label: "DEFAULT_SFX_PACK", type: "constant", detail: "TAudioSfxPack", info: "The built-in sounds. In a project: import { DEFAULT_SFX_PACK } from \"eo-typewriterjs/audio-pack\"." },
];

const TYPEWRITER_MEMBERS: readonly Completion[] = [
  { label: "timeline", type: "property", detail: "TimelineBuilder", info: "Add commands to play." },
  snippet("play", "play()", "() => Promise<void>", "Play, resume a pause, or replay once completed."),
  snippet("pause", "pause()", "() => void", "Pause on what is rendered."),
  snippet("stop", "stop()", "() => void", "Stop and clear to the initial state."),
  snippet("cancel", "cancel()", "() => void", "Stop and keep what is rendered."),
  snippet("replay", "replay()", "() => Promise<void>", "Play again from the start."),
  snippet("seek", "seek(${1:0})", "(ms: number) => void", "Jump to a time in the timeline."),
  snippet("stepForward", "stepForward()", "() => void", "Apply the next step and pause."),
  snippet("stepBackward", "stepBackward()", "() => void", "Undo the last step and pause."),
  snippet("setRate", "setRate(${1:2})", "(rate: number) => void", "Change the playback speed."),
  snippet("destroy", "destroy()", "() => void", "Stop and unmount the renderer."),
  snippet("getState", "getState()", "() => TPlaybackControllerState", "Status, current time, duration and rate."),
  snippet("getLiveState", "getLiveState()", "() => TTypewriterState", "The document, cursors and selections."),
  snippet("setCursorVisible", "setCursorVisible(${1:false})", "(visible, cursor?) => void", "Show or hide cursors."),
  snippet("setCursorOptions", "setCursorOptions({ ${1:kind: ECursorKind.BLOCK} })", "(options, cursor?) => void", "Change how cursors look."),
  snippet("setAudioEnabled", "setAudioEnabled(${1:true})", "(enabled: boolean) => void", "Turn sound on or off."),
  snippet("setAudioVolume", "setAudioVolume(${1:0.5})", "(volume: number) => void", "Set the master volume (0 to 1)."),
  snippet("setAudioOptions", "setAudioOptions({ ${1} })", "(options) => void", "Replace the audio configuration."),
  snippet("getAudioOptions", "getAudioOptions()", "() => TAudioOptions", "The current audio configuration."),
];

const TIMELINE_METHODS: readonly Completion[] = [
  snippet("type", "type(\"${1:text}\", { interval: ${2:60} })", "(text, options?)", "Type text one step at a time."),
  snippet("delete", "delete(${1:-1}, { interval: ${2:60} })", "(count | \"start\" | \"end\" | \"whole\", options?)", "Delete before (negative) or after (positive) the cursor."),
  snippet("move", "move(${1:-1})", "(offset | \"start\" | \"end\", options?)", "Move the cursor by a relative offset, or to the start or end."),
  snippet("select", "select(${1:-5})", "(count | \"start\" | \"end\" | \"whole\", options?)", "Select from the cursor; negative selects backward."),
  snippet("unselect", "unselect()", "(options?)", "Clear the selection."),
  snippet("style", "style(\"${1:tw-accent}\", { from: ${2:0}, to: ${3:5} })", "(style, range | \"selection\", options?)", "Style a range or the selection."),
  snippet("unstyle", "unstyle({ from: ${1:0}, to: ${2:5} })", "(range | \"selection\", options?)", "Remove styles from a range; overlaps are clipped."),
  snippet("wait", "wait(${1:500})", "(ms, options?)", "Pause the timeline."),
  snippet("call", "call(({ state }) => {\n  ${1}\n})", "(callback, options?)", "Run a callback; playback waits for its promise."),
];

const ENUM_MEMBERS: Readonly<Record<string, readonly string[]>> = {
  EPlaybackStatus: ["IDLE", "PLAYING", "PAUSED", "STOPPED", "COMPLETED", "CANCELLED"],
  ECommandKind: ["TYPE", "DELETE", "MOVE", "WAIT", "SELECT", "UNSELECT", "STYLE", "UNSTYLE", "CALL"],
  ECursorKind: ["PIPE", "UNDERSCORE", "BLOCK", "BLOCK_UNDERSCORE", "CARET", "CUSTOM"],
  EAudioStrategy: ["SHUFFLE_BAG", "ROUND_ROBIN", "RANDOM"],
};

const HOOK_OPTIONS: readonly Completion[] = [
  snippet("before", "before: ({ state }) => {\n  ${1}\n}", "TCallbackHook", "Runs before every step."),
  snippet("after", "after: ({ state }) => {\n  ${1}\n}", "TCallbackHook", "Runs after every step."),
  { label: "audio", type: "property", detail: "false | { sfx, sfxs, volume }", info: "Silence or adjust this command's sound." },
];

const MOTION_OPTIONS: readonly Completion[] = [
  { label: "by", type: "property", detail: "\"char\" | \"grapheme\" | \"word\" | \"line\" | { unit, amount }", info: "The unit of each step. Default: \"char\"." },
  { label: "interval", type: "property", detail: "number", info: "Milliseconds between steps. Default: 50." },
  { label: "cursor", type: "property", detail: "string | string[]", info: "The cursor(s) to act on. Default: \"main\"." },
  ...HOOK_OPTIONS,
];

const COMMAND_OPTIONS: Readonly<Record<string, readonly Completion[]>> = {
  type: [
    ...MOTION_OPTIONS.map(option => option.label === "by" ? { ...option, detail: "\"char\" | \"grapheme\" | \"word\" | \"line\" | \"whole\" | { unit, amount }" } : option),
    { label: "style", type: "property", detail: "string | TStyleObject", info: "Style the typed text as it appears." },
  ],
  delete: MOTION_OPTIONS,
  move: MOTION_OPTIONS,
  select: MOTION_OPTIONS,
  style: [{ label: "cursor", type: "property", detail: "string | string[]", info: "Whose selection to use with \"selection\"." }, ...HOOK_OPTIONS],
  unstyle: [{ label: "cursor", type: "property", detail: "string | string[]", info: "Whose selection to use with \"selection\"." }, ...HOOK_OPTIONS],
  unselect: [{ label: "cursor", type: "property", detail: "string | string[]", info: "The cursor(s) to act on." }, ...HOOK_OPTIONS],
  wait: HOOK_OPTIONS,
  call: HOOK_OPTIONS,
};

const CALLBACK_CONTEXT: readonly Completion[] = [
  { label: "state", type: "property", detail: "TTypewriterState", info: "The document, cursors and selections." },
  { label: "stepIndex", type: "property", detail: "number", info: "The step being run, from 0." },
  { label: "stepCount", type: "property", detail: "number", info: "The number of steps of the command." },
  { label: "unit", type: "property", detail: "TAdvanceUnit | null", info: "The step unit, or null for instant commands." },
  { label: "signal", type: "property", detail: "AbortSignal", info: "Aborted when playback is paused, stopped or cancelled." },
];

/* eslint-enable no-template-curly-in-string */

/**
 * @description
 * Find the command whose options object the cursor is in, e.g. `type` in `.type("a", { |`
 *
 * @param before - The text before the cursor
 * @returns The command name, or null
 */
function optionsContext(before: string): string | null {
  const match = /\.(\w+)\((?:[^()]|\([^()]*\))*\{[^{}]*$/.exec(before);

  return match?.[1] ?? null;
}

/**
 * @description
 * Completion source of the playground editor
 *
 * @param context - The CodeMirror completion context
 * @returns The completions to offer, or null
 */
function completions(context: CompletionContext): CompletionResult | null {
  const before = context.state.sliceDoc(Math.max(0, context.pos - 2000), context.pos);
  const word = context.matchBefore(/\w*/);
  const from = word?.from ?? context.pos;
  const member = /(\w+)(\.\w+)?\.\w*$/.exec(before);

  if (member !== null) {
    const [, owner, property] = member;

    if (property === ".timeline") {
      return { from, options: TIMELINE_METHODS };
    }

    if (property === undefined && owner !== undefined && owner in ENUM_MEMBERS) {
      return { from, options: ENUM_MEMBERS[owner]!.map(label => ({ label, type: "constant" })) };
    }

    const typewriters = [...context.state.doc.toString().matchAll(/(\w+)\s*=\s*createTypewriter\(/g)].map(match => match[1]);

    if (property === undefined && (owner === "tw" || typewriters.includes(owner))) {
      return { from, options: TYPEWRITER_MEMBERS };
    }

    return null;
  }

  if (/\(\s*\{[^}]*$/.test(before.slice(-120)) && /(?:before|after|call)\s*[:(]\s*(?:async\s*)?\(\s*\{[^}]*$/.test(before)) {
    return { from, options: CALLBACK_CONTEXT };
  }

  const command = optionsContext(before);

  if (command !== null && command in COMMAND_OPTIONS) {
    return { from, options: COMMAND_OPTIONS[command]! };
  }

  if (word === null || (word.from === word.to && !context.explicit)) {
    return null;
  }

  return { from, options: GLOBALS };
}

/**
 * @description
 * Syntax colours taken from the VitePress theme, so they follow light and dark mode
 */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: "var(--vp-c-purple-1)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--vp-c-green-1)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--vp-c-yellow-1)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--vp-c-text-3)", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--vp-c-indigo-1)" },
  { tag: [tags.propertyName], color: "var(--vp-c-brand-1)" },
  { tag: [tags.typeName, tags.className], color: "var(--vp-c-yellow-1)" },
]);

/**
 * @description
 * Editor chrome taken from the VitePress theme
 */
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13.5px", backgroundColor: "var(--vp-code-block-bg)", color: "var(--vp-c-text-1)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--vp-font-family-mono)", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--vp-c-brand-1)", padding: "12px 0" },
  ".cm-cursor": { borderLeftColor: "var(--vp-c-brand-1)", borderLeftWidth: "2px" },
  ".cm-gutters": { backgroundColor: "var(--vp-code-block-bg)", color: "var(--vp-c-text-3)", border: "none" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--vp-c-default-soft)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "var(--vp-c-brand-soft) !important" },
  ".cm-tooltip": { backgroundColor: "var(--vp-c-bg-elv)", border: "1px solid var(--vp-c-divider)", borderRadius: "8px", overflow: "hidden" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--vp-c-brand-soft)", color: "var(--vp-c-text-1)" },
  ".cm-completionDetail": { color: "var(--vp-c-text-3)", fontStyle: "normal", marginLeft: "8px" },
  ".cm-completionInfo": { backgroundColor: "var(--vp-c-bg-elv)", border: "1px solid var(--vp-c-divider)", padding: "6px 10px" },
});

/**
 * @description
 * Options of a playground editor
 */
export type TEditorOptions = {
  readonly parent: HTMLElement;
  readonly doc: string;
  readonly label: string;
  readonly onChange: (code: string) => void;
  readonly onRun: () => void;
};

/**
 * @description
 * Create the playground's code editor
 *
 * @param options - Where to mount it, its content and callbacks
 * @returns The editor view
 */
export function createEditor(options: TEditorOptions): EditorView {
  const run = (): boolean => {
    options.onRun();

    return true;
  };

  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    javascript(),
    syntaxHighlighting(highlight),
    autocompletion({ override: [completions], icons: false }),
    keymap.of([
      { key: "Mod-Enter", run },
      { key: "Mod-s", run, preventDefault: true },
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ "aria-label": options.label }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        options.onChange(update.state.doc.toString());
      }
    }),
    theme,
  ];

  return new EditorView({
    parent: options.parent,
    state: EditorState.create({ doc: options.doc, extensions }),
  });
}

/**
 * @description
 * Replace the editor's content
 *
 * @param view - The editor
 * @param code - The new content
 */
export function setEditorCode(view: EditorView, code: string): void {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
}

/**
 * @description
 * Move the editor's cursor to a line and reveal it, e.g. the line of an error
 *
 * @param view - The editor
 * @param line - The 1-based line
 */
export function revealLine(view: EditorView, line: number): void {
  const target = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines));

  view.dispatch({ selection: { anchor: target.from, head: target.to }, scrollIntoView: true });
  view.focus();
}
