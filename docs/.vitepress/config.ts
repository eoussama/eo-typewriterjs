import { createRequire } from "node:module";

import { defineConfig } from "vitepress";



const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };



/**
 * @description
 * VitePress site configuration for eo-typewriterjs documentation
 */
export default defineConfig({
  vite: {
    define: {
      __PKG_VERSION__: JSON.stringify(pkg.version),
    },
  },

  title: "EO TypewriterJS",
  description: "JavaScript utility for advanced typewriter-like animations.",
  base: "/eo-typewriterjs/",
  cleanUrls: true,

  head: [["link", { rel: "icon", href: "/eo-typewriterjs/logo.svg" }]],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "EO TypewriterJS",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API Reference", link: "/api/" },
      { text: "Sandbox", link: "https://eoussama.github.io/eo-typewriterjs/sandbox/", target: "_blank" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Core Concepts", link: "/guide/core-concepts" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "Renderers", link: "/guide/renderers" },
            { text: "Timeline", link: "/guide/timeline" },
            { text: "Recipes", link: "/guide/recipes" },
          ],
        },
        {
          text: "Commands",
          items: [
            { text: "Overview", link: "/guide/commands/" },
            { text: "type", link: "/guide/commands/type" },
            { text: "wait", link: "/guide/commands/wait" },
            { text: "delete", link: "/guide/commands/delete" },
            { text: "move", link: "/guide/commands/move" },
            { text: "select", link: "/guide/commands/select" },
            { text: "unselect", link: "/guide/commands/unselect" },
            { text: "style", link: "/guide/commands/style" },
            { text: "unstyle", link: "/guide/commands/unstyle" },
            { text: "call", link: "/guide/commands/call" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [{ text: "Overview", link: "/api/" }],
        },
        {
          text: "Factory",
          items: [{ text: "createTypewriter", link: "/api/functions/createTypewriter" }],
        },
        {
          text: "Timeline",
          items: [{ text: "TimelineBuilder", link: "/api/classes/TimelineBuilder" }],
        },
        {
          text: "Audio",
          items: [{ text: "AudioManagerHelper", link: "/api/classes/AudioManagerHelper" }],
        },
        {
          text: "Renderers",
          items: [
            { text: "domRenderer", link: "/api/functions/domRenderer" },
            { text: "stringRenderer", link: "/api/functions/stringRenderer" },
            { text: "DomRenderer", link: "/api/classes/DomRenderer" },
            { text: "StringRenderer", link: "/api/classes/StringRenderer" },
            { text: "IRenderer", link: "/api/interfaces/IRenderer" },
          ],
        },
        {
          text: "State Utilities",
          items: [
            { text: "segmentRichText", link: "/api/functions/segmentRichText" },
            { text: "mergeStyles", link: "/api/functions/mergeStyles" },
            { text: "resolveStyleRef", link: "/api/functions/resolveStyleRef" },
            { text: "getSelection", link: "/api/functions/getSelection" },
            { text: "withCursor", link: "/api/functions/withCursor" },
            { text: "withSelection", link: "/api/functions/withSelection" },
            { text: "withSelectionCleared", link: "/api/functions/withSelectionCleared" },
            { text: "normalizeCursors", link: "/api/functions/normalizeCursors" },
          ],
        },
        {
          text: "Typewriter Types",
          items: [
            { text: "TTypewriter", link: "/api/type-aliases/TTypewriter" },
            { text: "TTypewriterOptions", link: "/api/type-aliases/TTypewriterOptions" },
            { text: "TTypewriterState", link: "/api/type-aliases/TTypewriterState" },
          ],
        },
        {
          text: "Command Types",
          items: [
            { text: "TCommand", link: "/api/type-aliases/TCommand" },
            { text: "TCommandKind", link: "/api/type-aliases/TCommandKind" },
            { text: "TBaseCommand", link: "/api/type-aliases/TBaseCommand" },
            { text: "TCursorSelector", link: "/api/type-aliases/TCursorSelector" },
            { text: "TTypeCommand", link: "/api/type-aliases/TTypeCommand" },
            { text: "TTypeOptions", link: "/api/type-aliases/TTypeOptions" },
            { text: "TAdvanceMode", link: "/api/type-aliases/TAdvanceMode" },
            { text: "TAdvanceModeInput", link: "/api/type-aliases/TAdvanceModeInput" },
            { text: "TAdvanceUnit", link: "/api/type-aliases/TAdvanceUnit" },
            { text: "TDeleteCommand", link: "/api/type-aliases/TDeleteCommand" },
            { text: "TDeleteOptions", link: "/api/type-aliases/TDeleteOptions" },
            { text: "TMoveCommand", link: "/api/type-aliases/TMoveCommand" },
            { text: "TMoveOptions", link: "/api/type-aliases/TMoveOptions" },
            { text: "TSelectCommand", link: "/api/type-aliases/TSelectCommand" },
            { text: "TSelectOptions", link: "/api/type-aliases/TSelectOptions" },
            { text: "TUnselectCommand", link: "/api/type-aliases/TUnselectCommand" },
            { text: "TUnselectOptions", link: "/api/type-aliases/TUnselectOptions" },
            { text: "TStyleCommand", link: "/api/type-aliases/TStyleCommand" },
            { text: "TStyleOptions", link: "/api/type-aliases/TStyleOptions" },
            { text: "TStyleRange", link: "/api/type-aliases/TStyleRange" },
            { text: "TUnstyleCommand", link: "/api/type-aliases/TUnstyleCommand" },
            { text: "TUnstyleOptions", link: "/api/type-aliases/TUnstyleOptions" },
            { text: "TCallCommand", link: "/api/type-aliases/TCallCommand" },
            { text: "TCallbackFn", link: "/api/type-aliases/TCallbackFn" },
            { text: "TCallbackContext", link: "/api/type-aliases/TCallbackContext" },
            { text: "TCallbackHook", link: "/api/type-aliases/TCallbackHook" },
            { text: "TCommandHookOptions", link: "/api/type-aliases/TCommandHookOptions" },
            { text: "TWaitCommand", link: "/api/type-aliases/TWaitCommand" },
            { text: "TWaitOptions", link: "/api/type-aliases/TWaitOptions" },
          ],
        },
        {
          text: "Event Types",
          items: [
            { text: "TTimelineEvent", link: "/api/type-aliases/TTimelineEvent" },
            { text: "TBaseEvent", link: "/api/type-aliases/TBaseEvent" },
            { text: "TEventKind", link: "/api/type-aliases/TEventKind" },
            { text: "TInsertEvent", link: "/api/type-aliases/TInsertEvent" },
            { text: "TDeleteEvent", link: "/api/type-aliases/TDeleteEvent" },
            { text: "TMoveEvent", link: "/api/type-aliases/TMoveEvent" },
            { text: "TSelectEvent", link: "/api/type-aliases/TSelectEvent" },
            { text: "TUnselectEvent", link: "/api/type-aliases/TUnselectEvent" },
            { text: "TStyleEvent", link: "/api/type-aliases/TStyleEvent" },
            { text: "TUnstyleEvent", link: "/api/type-aliases/TUnstyleEvent" },
          ],
        },
        {
          text: "State Types",
          items: [
            { text: "TCursorState", link: "/api/type-aliases/TCursorState" },
            { text: "TSelectionState", link: "/api/type-aliases/TSelectionState" },
            { text: "TRichTextDocument", link: "/api/type-aliases/TRichTextDocument" },
            { text: "TRichTextSegment", link: "/api/type-aliases/TRichTextSegment" },
            { text: "TTextMark", link: "/api/type-aliases/TTextMark" },
            { text: "TStyleObject", link: "/api/type-aliases/TStyleObject" },
            { text: "TStyleRef", link: "/api/type-aliases/TStyleRef" },
          ],
        },
        {
          text: "Cursor Types",
          items: [
            { text: "ECursorKind", link: "/api/variables/ECursorKind" },
            { text: "TCursorKind", link: "/api/type-aliases/TCursorKind" },
            { text: "TCursorRenderOptions", link: "/api/type-aliases/TCursorRenderOptions" },
            { text: "TCursorAnimation", link: "/api/type-aliases/TCursorAnimation" },
            { text: "TCursorAnimationOptions", link: "/api/type-aliases/TCursorAnimationOptions" },
            { text: "TResolvedCursorRenderOptions", link: "/api/type-aliases/TResolvedCursorRenderOptions" },
          ],
        },
        {
          text: "Audio Types",
          items: [
            { text: "EAudioStrategy", link: "/api/variables/EAudioStrategy" },
            { text: "TAudioStrategy", link: "/api/type-aliases/TAudioStrategy" },
            { text: "TAudioOptions", link: "/api/type-aliases/TAudioOptions" },
            { text: "TAudioChannelOptions", link: "/api/type-aliases/TAudioChannelOptions" },
            { text: "TAudioCommandOverride", link: "/api/type-aliases/TAudioCommandOverride" },
            { text: "TAudioVoice", link: "/api/type-aliases/TAudioVoice" },
            { text: "TAudioVoicePack", link: "/api/type-aliases/TAudioVoicePack" },
            { text: "DEFAULT_VOICE_PACK", link: "/api/variables/DEFAULT_VOICE_PACK" },
          ],
        },
        {
          text: "Playback Types",
          items: [
            { text: "TCheckpoint", link: "/api/type-aliases/TCheckpoint" },
            { text: "TPlaybackControllerState", link: "/api/type-aliases/TPlaybackControllerState" },
            { text: "TPlaybackStatus", link: "/api/type-aliases/TPlaybackStatus" },
          ],
        },
        {
          text: "Constants",
          items: [
            { text: "ECommandKind", link: "/api/variables/ECommandKind" },
            { text: "EEventKind", link: "/api/variables/EEventKind" },
            { text: "EPlaybackStatus", link: "/api/variables/EPlaybackStatus" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/eoussama/eo-typewriterjs" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © EOussama",
    },

    editLink: {
      pattern: "https://github.com/eoussama/eo-typewriterjs/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },

    search: {
      provider: "local",
    },
  },
});
