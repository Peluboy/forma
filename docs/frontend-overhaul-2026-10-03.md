# Frontend design direction: Editorial workbench

The interface exists to help a nontechnical person start from a reference or template, apply exact manuscript copy, inspect the result, and export confidently. It is a functional studio, not a marketing canvas. Its dominant tone is **editorial minimalism**, with a small amount of utilitarian precision.

The recognition anchor is Forma's dark pine tool spine beside a warm neutral canvas stage. The artwork remains the most colorful surface. Space Grotesk is used sparingly for product identity and top-level headings; DM Sans carries controls and long-form UI. One pine accent identifies the primary action and active tool. Controls use a 4/8/12/16/24 spacing rhythm. Motion is limited to hover, focus and panel state changes, with reduced-motion support already in the token layer.

Design Feasibility & Impact Index: impact **4**, context fit **5**, implementation feasibility **4**, performance safety **4**, consistency risk **3**; score **14**. The direction uses existing local font assets and CSS variables, so it adds no network font dependency or runtime animation library.

## Audit that drives this pass

| Current friction | Change |
|---|---|
| The editor rail labels are 9–10 px and competing document modes look like everyday tools. | Increase hit targets/type, lead with Design, Elements and Text, then group input and output modes. |
| The header gives no persistent product landmark and its controls have nearly equal emphasis. | Add a compact Forma wordmark and keep Export as the clear primary action. |
| The light canvas stage and panel chrome blend into one pale sheet. | Establish a warm stage and darker tool spine; strengthen panel heading and toolbar boundaries. |
| New users must infer whether to start from a template or reference. | Put both starts at the top of the dashboard with plain labels and direct actions. |
| Template cards and tool controls have weak hover/focus affordances. | Add deliberate elevation, borders and visible keyboard focus while preserving low visual noise. |
| Shared React buttons look like plain text because legacy unlayered CSS overrides generated utility classes. | Give the shared button component explicit semantic classes and preserve primary/secondary/ghost/danger contrast across themes. |
| The old global stylesheet fetches Google Fonts even though the product bundles UI fonts. | Remove the external import and use the local DM Sans and Space Grotesk files. |
| Account, sign-in and onboarding still use hard-coded purple from an older visual direction. | Replace those chrome colors with the same semantic pine/neutral tokens, and align the public hero, filters, FAQ and footer with the product brand. |

This follows the behavior pattern shown in the user's Canva screenshots and Canva's public editor guidance: navigation at the edge, a prominent artboard, contextual actions, and panels that can be dismissed. Forma keeps its own identity and exact-copy workflow. The [canvas action guide](editor-canvas-actions.md) covers the implemented interactions; [status](STATUS.md) records verification and remaining gaps.
