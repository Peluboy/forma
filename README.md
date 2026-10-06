# Forma

Forma is a manuscript-first design workspace for graphics, documents and slides. It offers AI-assisted visual directions from approved copy, optional references and brands, plus an editor, reusable templates, copy mapping, review and exports.

## Start here

[Complete product documentation index](docs/README.md) · [Verification record](docs/verification.md)


- [Product specification and scope](docs/product.md)
- [End-to-end user guide](docs/user-guide.md)
- [Create with AI guide](docs/create-with-ai.md)
- [Architecture and data model](docs/architecture.md)
- [Codebase guide for developers](docs/codebase-guide.md)
- [API contracts](docs/api.md)
- [Deployment and operations](docs/deployment.md)
- [Privacy and security](docs/privacy-security.md)
- [Testing and release gates](docs/testing-release.md)

Use Node.js 24. Install dependencies with `npm ci`. Copy `.env.example` to `.env` and choose local mode for development. Run `npm run setup:ocr` for local text recognition, then `npm run dev` to start the frontend and API. See the deployment guide for production setup. Never put server credentials in a `VITE_` environment variable.

Before handing off a change, run `npm run lint`, `npm run build`, and `npm test`; the [codebase guide](docs/codebase-guide.md) lists API, database, and browser checks for affected flows.

## Implemented beta

- Accounts, durable projects, saved revisions, conflict handling, and deletion.
- Manual reference editing and automatic text-region review through local OCR or configured OpenAI.
- Three AI-planned editable directions for graphics, documents and slides through configured Gemini; sign-in required for generation.
- Exact-copy manuscript updates from TXT, Markdown, DOCX, and text-based PDF.
- Six built-in templates, reusable personal templates, and brand colors.
- Expiring review links with comments, approval, and revocation.
- PNG, SVG, PDF, editable JSON, and three-format campaign ZIP exports.

The running local preview is `http://127.0.0.1:5173`; the development API is `http://127.0.0.1:8787`. Local accounts show a recovery code rather than sending email.

## Product boundaries

Forma preserves manuscript wording through deterministic text mapping; it does not promise byte-identical whitespace or automatic recovery of an arbitrary flattened design. Reference replacement uses editable text over solid color covers. Textured backgrounds, original font recovery, unlimited layers, and generative retouching are outside this beta. AI proposes regions for human review; it does not write the approved manuscript.

