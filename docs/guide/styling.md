# Styling

The typewriter document supports rich-text styles that live alongside the plain text. This page explains the style model, how styles are applied and removed, and how to use styles with both built-in renderers.

## The style model

Styles are stored as a list of `TTextStyle` entries on the document:

```ts
type TTextStyle = {
  readonly from: number;   // start index (inclusive)
  readonly to: number;     // end index (exclusive)
  readonly style: TStyleRef;
};
```

`TStyleRef` is either a plain class-name string or a `TStyleObject`:

```ts
type TStyleRef = string | TStyleObject;

type TStyleObject = {
  className?: string;  // space-separated CSS class names
  css?: Record<string, string>;  // inline styles: { color: "red" }
  attrs?: Record<string, string>; // HTML attributes: { "data-kind": "error" }
  ansi?: Record<string, string>;  // ANSI codes for terminal output
  meta?: unknown;  // arbitrary metadata, ignored by built-in renderers
};
```

Styles annotate index ranges of the document text. They do not store a copy of the text, they store positions. When the document text changes (type, delete), the library shifts and trims style ranges to keep them in sync.

## Applying styles

Use `.style()` to apply a style to an explicit range or to the active selection:

```ts
tw.timeline
  .type("Hello World")
  .style("greeting", { from: 0, to: 5 })   // class name on "Hello"
  .style("accent",   { from: 6, to: 11 });  // class name on "World"
```

The `style` argument is a `TStyleRef`, a string (class name) or a `TStyleObject`:

```ts
tw.timeline
  .type("Error: not found")
  .style({ css: { color: "red", fontWeight: "bold" } }, { from: 0, to: 5 });
```

### Styling a selection

Pass `"selection"` as the range to apply the style to whatever each targeted cursor has selected. The selection is cleared after the style is applied:

```ts
tw.timeline
  .type("Important notice")
  .move(-6)
  .select(6)
  .style("highlight", "selection");
```

This is the most natural way to apply styles to text that is typed or moved to dynamically.

## Removing styles

Use `.unstyle()` to remove all style annotations that overlap a range:

```ts
tw.timeline.unstyle({ from: 0, to: 5 });
```

Like `.style()`, `"selection"` works as a range shorthand:

```ts
tw.timeline
  .select("whole")
  .unstyle("selection");
```

`.unstyle()` removes any style whose range **overlaps** the given range, including styles that only partially overlap. It does not trim; it removes the entire entry.

## How delete affects styles

When `.delete()` removes a range of text, style entries within that range are removed or adjusted:

- Styles **entirely within** the deleted range are removed.
- Styles that **partially overlap** the deleted range are trimmed to end at the deletion boundary.
- Styles that **follow** the deleted range are shifted left by the number of deleted characters.

This means styles stay attached to their text as the document evolves.

## Overlapping styles

Multiple styles can cover the same character range. They are stored independently and applied in order. The DOM renderer renders them as **nested spans**, outermost-first, so the first style applied is the outermost wrapper:

```ts
tw.timeline
  .type("Bold and underlined")
  .style("bold",      { from: 0, to: 4 })
  .style("underline", { from: 0, to: 4 });
```

```html
<!-- rendered -->
<span class="bold"><span class="underline">Bold</span></span>
```

To produce a single element with both classes, use a single `TStyleObject` with both class names:

```ts
tw.timeline.style({ className: "bold underline" }, { from: 0, to: 4 });
```

## Styles and the DOM renderer

The `DomRenderer` maps `TStyleObject` fields onto `<span>` elements:

| Field | DOM effect |
|---|---|
| `className` | `classList.add(...)` |
| `css` | `el.style[prop] = value` (inline) |
| `attrs` | `el.setAttribute(key, value)` |
| `ansi` | Ignored |
| `meta` | Ignored |

A plain string ref is treated as a class name.

### Selection styling

When a cursor has an active selection, the selected text is wrapped in a `<span class="typewriter-selection">`. Add this to your stylesheet to give it a visible background:

```css
.typewriter-selection {
  background: rgba(59, 130, 246, 0.35);
  border-radius: 2px;
}
```

When selected text also carries a text style, the selection span and style span(s) are separate nested elements. The `typewriter-selection` span is always the outermost wrapper.

## Styles and the string renderer

`StringRenderer.toString()` returns plain text with styles stripped. Use `toAnsiString()` when styles carry ANSI codes:

```ts
const renderer = stringRenderer();
const tw = createTypewriter({ renderer });

tw.timeline
  .type("ERROR: disk full")
  .style({ ansi: { fg: "31", bold: "1" } }, { from: 0, to: 5 });

await tw.play();

console.log(renderer.toAnsiString());
// "\x1B[31;1mERROR\x1B[0m: disk full"
```

The ANSI `ansi` map keys are arbitrary labels; the values are ANSI code segments joined with `;` before wrapping the text in `\x1B[<codes>m...\x1B[0m`.

## Working with styles in a custom renderer

Use `segmentRichText()` to split the document into non-overlapping segments, each with its ordered stack of active styles:

```ts
import { segmentRichText, mergeStyles } from "eo-typewriterjs";
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";

class StyledConsoleRenderer implements IRenderer {
  render(state: TTypewriterState): void {
    const segments = segmentRichText(state.document);

    for (const segment of segments) {
      if (segment.styles.length > 0) {
        const merged = mergeStyles(segment.styles);
        // merged.className, merged.css, merged.ansi, etc.
        process.stdout.write(`[${merged.className ?? ""}]${segment.text}`);
      } else {
        process.stdout.write(segment.text);
      }
    }

    process.stdout.write("\n");
  }
}
```

`segmentRichText(doc)` returns `TRichTextSegment[]` where each segment has:

| Field | Type | Description |
|---|---|---|
| `text` | `string` | The text slice |
| `from` | `number` | Start index in the full document |
| `to` | `number` | End index (exclusive) |
| `styles` | `TStyleRef[]` | Ordered stack of style refs covering this slice |

`mergeStyles(refs)` flattens the stack into a single `TStyleObject` by merging all `className`, `css`, `attrs`, `ansi`, and `meta` fields. Useful for renderers that cannot produce nested output.

## Syntax highlighting example

Type code and apply classes that map to your CSS theme:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("const x = 42;", { by: "char", interval: 60 })
  .style("kw",  { from: 0,  to: 5  })  // "const"
  .style("var", { from: 6,  to: 7  })  // "x"
  .style("op",  { from: 8,  to: 9  })  // "="
  .style("num", { from: 10, to: 12 }); // "42"

await tw.play();
```

```css
.kw  { color: #c792ea; }
.var { color: #82aaff; }
.op  { color: #89ddff; }
.num { color: #f78c6c; }
```

## Type reference

- [`TTextStyle`](/api/type-aliases/TTextStyle)
- [`TStyleRef`](/api/type-aliases/TStyleRef)
- [`TStyleObject`](/api/type-aliases/TStyleObject)
- [`TRichTextDocument`](/api/type-aliases/TRichTextDocument)
- [`TRichTextSegment`](/api/type-aliases/TRichTextSegment)
- [`segmentRichText`](/api/functions/segmentRichText)
- [`mergeStyles`](/api/functions/mergeStyles)
