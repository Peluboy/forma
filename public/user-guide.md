# Forma user guide

## Add images and shapes

Open **Elements**, then choose **Upload image**, **Add rectangle** or **Add ellipse**. Select an element in the canvas or list to rename, move, resize, recolor a shape, lock or remove it. Arrow keys move a focused canvas element; Shift moves it farther. Precise controls stay under **Position and size**.

Use **Bring forward** and **Send backward** to arrange added images, shapes and text. These controls also appear when editing an added text box. The original design artwork and original manuscript areas stay underneath. Check the result visually because shapes and images can cover text; overlap is not automatically detected.

Images keep their proportions within their box. PNG, JPEG and WebP uploads must be under 5 MB and 16 megapixels; Forma optimizes them to a maximum 960-pixel image for the canvas. Detailed images may need a smaller source file. Each design allows up to 30 graphic elements with a shared image-size limit. The app explains when a limit is reached. Your original file is unchanged, but the optimized copy is what appears in exports.

Added elements follow the same save, reopen, undo, review and export flows. Editable backups with images or stacking use file format 3 and require this updated app. Older backups still open. Cropping, rotation, image replacement and custom canvas sizes are not yet available.

## Add your own text boxes

Open **Text → Add text**, then type your wording. Select the box in the canvas or text list to change its font, size, color and alignment. Drag it to move it, or focus the canvas box and use arrow keys (Shift moves farther). **Position and size** holds precise controls when needed. Lock a finished box to prevent edits, or remove it and use Undo if you change your mind.

These additional boxes stay separate from the manuscript: applying a new manuscript preserves them. No wording is generated automatically. You can add up to 50 boxes, each with up to 10,000 characters. Saved projects, editable backups, review snapshots and visual exports include them. Campaign ZIPs also include `additional-text.txt` alongside the original manuscript.

If text needs more room, adjust the box dimensions or text size. Visual export waits until overflow is resolved; editable backup is still available. Check placement visually: overlap with other objects is not automatically detected. Custom canvas sizes are not yet supported.

## Your project dashboard

Open `/dashboard` to find your saved designs. Signed-in users see their account projects; guests see designs stored in this browser. Search by name or sort by recently edited/name. Select a design card to reopen that exact project.

Choose **Start with a reference** to open the editor’s reference panel, then upload your image there. A template card starts a new design and leaves existing projects intact. Template sample text is a starting point; replace it with your manuscript.

In the editor, the **Forma logo** or **File → Back to my designs** saves applied changes before returning. Apply any pending manuscript draft first. A missing project link displays an error and does not create an automatic replacement.

## Account and onboarding

New accounts can choose their purpose and first-design starting point through `/onboarding`. Returning users who completed onboarding land on the dashboard after sign-in. `/account` contains profile, security, billing, and data/privacy controls. Local development accounts use recovery codes; hosted Supabase accounts use email confirmation and recovery. Hosted email flows still require deployment configuration and verification.

## First design

1. Choose a template in the left library, or open Reference and upload PNG, JPEG, or WebP up to 2 MB.
2. Paste your manuscript or import TXT, Markdown, DOCX, or a text-based PDF. PDF input is limited to 25 pages; all manuscript uploads are limited to 3 MB. Scanned PDFs need text extraction elsewhere. Formatting in the source document is not reproduced.
3. Review the mapped sections and apply the manuscript. The canvas uses applied text; an unapplied draft is not an exported or saved design revision.
4. Select text on the canvas to adjust geometry, size, color, and alignment. Use locks to prevent unintended movement.
5. Open design checks, resolve overflow and any unmapped sections, then visually inspect the canvas.
6. Export a visual file for sharing and a Forma project JSON for editable backup.

## Editor panels

The left tool rail opens templates, references, text controls or saved projects. Select the active tool again to hide its panel and give the canvas more room. The manuscript toolbar button opens or closes the right panel; mobile panels also have a close button.

Paste or upload copy in **Your manuscript**, then use **Apply manuscript** directly beneath the text. **Review changes before applying** compares revisions. Expand **Copy & artwork protection** for the always-on copy preservation and fitting rules. Collapsing these details does not change those rules. **Design checks** lists overflow and missing mappings; select a text area there to edit it.

## Recommended manuscript

```text
Eyebrow: COMMUNITY EVENING

Headline: Ideas worth sharing.

Body copy: Meet your neighbors for a relaxed evening of conversation.

Date & time: OCTOBER 24, 2026
6:00 PM

Location: THE FOUNDRY
Chicago

Footer: ALL ARE WELCOME.
```

Labels are instructions and are not printed. Supported aliases include Kicker/Eyebrow, Title/Headline, Body/Description/Body copy, Date/Date & time, Location, and Footer. Without labels, the first paragraph becomes the headline and the rest becomes body copy. A recognized label at the start of a line begins a new field; avoid that syntax inside ordinary paragraphs. Leading/trailing whitespace is trimmed, and text wraps to fit. Always inspect the mapped result.

## Updating a reference

Use the uploaded reference as the canvas. Draw a rectangle over each old text area and assign a manuscript field. Check its cover color: the app places a solid-color rectangle over old text, then renders your replacement text. This works best on flat backgrounds. Do not expect it to repair photographs, gradients, or complex artwork behind lettering.

When analysis is offered, choose local OCR, Gemini or OpenAI from the configured options, inspect proposed regions, correct field assignments, and apply approved suggestions. A proposal is not a verified reconstruction. Manual mapping remains available. OpenAI analysis sends the reference image to OpenAI only when that option is requested; do not use it for material you are not permitted to submit.

Reference aspect ratio is retained. Exports render at the application's output resolution; source pixels are resampled. Check small type, contrast, and background covers at full size before distribution.

## Revisions and recurring work

Paste or upload the revised manuscript. Review changed sections, including removals, before applying. Undo/redo addresses editing changes in the current workspace. Saved account revision history is a separate persistent record. Restore an older snapshot intentionally, then save it as a new current version.

Use a reusable design as a starting point for the next event or promotion. Keep a portable JSON copy outside the browser. Browser storage can be cleared or reach its quota; it is not a reliable sole backup.

## Accounts and reviews

The UI distinguishes a browser workspace, a local development account, and Supabase cloud mode. Local accounts are only for development. In cloud mode, follow signup confirmation or password-reset email instructions when required by Supabase configuration.

Save the current design before making a review link. A link shares a snapshot, not a continuously updating live editor. Anyone with that link can see its contents and use the available review actions until it expires or is revoked. Reviewer names are self-reported, not verified identities. Create a new review after revising the design.

## Troubleshooting

| Symptom | Action |
|---|---|
| Export disabled | Resolve overflow and map all nonempty reference fields. JSON backup remains available. |
| Text too small | Enlarge its region or intentionally revise the manuscript outside automatic fitting. |
| Old text visible | Enlarge/reposition the cover and check its color. Complex backgrounds require external retouching. |
| Cloud save conflict | Keep a JSON backup, load the newer saved version, and reconcile changes. |
| Analysis unavailable | Map regions manually; ask the operator to check provider configuration. |
| Login/reset email missing | Check spam, confirmation settings, allowed redirect URLs, and the configured email provider. |
| Missing project after switching devices | Browser-only designs do not automatically exist in your cloud account; open a project backup or explicitly save while signed in. |

Design checks assess measurable text fit and mapping; they do not certify readability, copyright permissions, print suitability, or overall aesthetic quality.

## Export choices and campaign packs

- PNG: rendered 1080-pixel-wide graphic.
- SVG: scalable artwork with editable text; reference images stay embedded.
- PDF: flattened rendered image in a PDF page, not a tagged/editable text document.
- Forma JSON: editable project backup, including source reference and manuscript.

Editable backups now include a file-format version automatically. Continue using **File → Save project file** and **File → Open project file**; no setup or conversion step is needed. Older Forma backups still open. If a file needs features this editor does not support, Forma explains the problem and leaves the current design unchanged. Keep that original file for a compatible version. New backups require this version of Forma or later; older app versions may not recognize them.
- Campaign ZIP (templates): portrait (1080×1350), square (1080×1080), and story (1080×1920) PNGs, `approved-copy.txt`, and `editable.forma.json`. Every variant must pass fitting checks; otherwise the ZIP is not downloaded. Reference-mode campaigns are disabled to avoid silently changing source proportions.

## Saved templates, brand settings, and review links

Open Projects and select **Save current design as a template**. It makes a separate reusable copy. Under **My templates**, opening a template creates a new design so the template remains intact. The template carries existing copy; replace it through the manuscript panel.

The palette button opens account brand settings. Save text and background colors, then explicitly apply them to an editable template. The history button opens saved account revisions. Restoring creates a new current revision rather than deleting history.

Select **Share**, choose expiry, and create a review link. Creating a link does not send it. Copy/open the URL yourself. Reviewers add their name, comment, approve, or request changes. Refresh feedback status in Share to see updates. Revoke closes access. The link holds the saved snapshot; later design changes require a new link.

## Local account recovery

Local registration displays a recovery code once. Save it before dismissing the dialog. **Forgot password?** requires that code and rotates it after a successful reset. Supabase production accounts instead use the configured confirmation/password-reset email flow. Guest projects are saved in this browser; signing in to an empty account imports the current guest design. Signing out returns to guest projects.

## Plans and billing

Open **Plans** in the navigation, or **Plans and billing** in your account. Free includes the editor and exports. Pro adds a larger monthly analysis allowance when subscriptions are available. Pricing comes from the configured Paystack plan; unpublished prices cannot be purchased. After checkout, select **Refresh billing** to verify payment. **Manage subscription** opens Paystack to update your card or cancel renewal. Your designs stay available after returning to Free.

## Choosing an analysis provider

Open Reference and select **Analysis provider**. Gemini is selected initially when configured; OpenAI and local OCR remain available when enabled. Upload your reference, click **Detect text areas**, inspect the suggested regions, then apply the mappings. Switching providers never rewrites your manuscript. Cloud providers receive your reference image, including any text visible in it; the separate manuscript is not sent. Google’s free tier may use submitted content to improve its products, so use non-confidential test references there. Provider errors leave manual region mapping available.
