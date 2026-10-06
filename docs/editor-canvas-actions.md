# Canvas editing and Canva reference

Forma uses the editor patterns shown in the supplied Canva screenshots and described in Canva's public [editor navigation](https://www.canva.com/help/glow-up/), [text editing](https://www.canva.com/help/add-and-edit-text/), [text formatting](https://www.canva.com/help/format-text/), [layers](https://www.canva.com/en_au/help/layer-group-align-variantb/) and [Brand Kit](https://www.canva.com/help/brand-kit/) guides. This is a product-specific implementation, not a claim of visual or feature parity with Canva. The current layout keeps a narrow tool rail, a closable library, a large artboard, contextual controls, a closeable Layers panel and a compact first-use guide.

## What works now

| Action | Where | Result |
|---|---|---|
| Edit wording directly | Double-click a text box or manuscript field on the artboard | A focused editor appears over the object. Click away or press Cmd/Ctrl+Enter to save; Escape cancels. Managed field edits update Content; added text stays independent. |
| Format selected text | Floating toolbar and Text panel | Font family, available weight, size, color, emphasis, alignment, spacing, opacity and other supported styles. Curated fonts are bundled; see [typography and assets](typography-and-assets.md). |
| Use and replace colors | **Colors** on the contextual toolbar | Choose a document, brand or custom color. The optional **Change all matching colors** replaces exact matching color values in this design. It does not infer similar colors or alter image pixels. |
| Edit brand styles | **File → Brand** or the brand control in Colors | Save reusable text/background/accent colors, up to 12 additional palette colors, and display/body fonts for this account or browser workspace. |
| Inspect layers | **Layers** above the artboard | Select, hide/show or lock added objects and manuscript fields. Move added layers forward/backward. Close the panel to regain space. Original reference artwork is not an independent editable layer. |
| Open object actions | Right-click a selected object | Copy, paste, copy/paste style, duplicate, order, lock, hide and open Layers. Clipboard items are held in this editor session. |
| Open page actions | Right-click the artboard or select **Page actions** above it | Paste copied objects, copy/paste page style, resize template graphics pages and show guides. Documents and slides offer add, duplicate and hide/show page or slide; hidden pages are omitted from visual PDF/PPTX exports. The final visible page cannot be hidden. |
| Insert photos | **Elements → Images** | Upload a PNG, JPEG or WebP image layer. Added images crop to fill their bounds without stretching. |
| Insert photo frames | **Elements** frame tiles | Add rectangular, rounded or ellipse placeholders. Upload a photo while a frame is selected, or drag an uploaded image layer over it to place the photo inside. Resize the frame to adjust the crop. |

## Current limits and next validation

The contextual clipboard does not synchronize with the operating-system clipboard. Frames use centered fill cropping; a person cannot pan, set a focal point, rotate or mask with arbitrary shapes yet. Drag-to-frame works for image layers already on the artboard, not directly from the operating system or asset library. Text fitting detects overflow, but it does not resolve overlap between objects. Right-click actions cover the supported design models, not Canva's video, animation or third-party app features.

Browser tests cover direct copy editing and Content synchronization, replace-all color, context copy/paste, Layers visibility, frame upload/drag/reopen and presentation page actions. Desktop light and narrow mobile dark screenshots have been inspected. A systematic accessibility review, keyboard-only edit pass, real-document export inspection and user sessions with nontechnical participants remain release work. See [current status](STATUS.md) and [delivery checklist](TODO.md).
