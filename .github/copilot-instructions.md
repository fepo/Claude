# Copilot Instructions

## Project snapshot
- App: Next.js 15 App Router + React 19 + TypeScript + Tailwind.
- Purpose: generate chargeback contestation texts in PT-BR, then export to DOCX/PDF.
- Core source-of-truth model: `src/types.ts` (`FormContestacao`, `TipoContestacao`, `Gateway`).
- Storage is browser-only (`localStorage`) via `src/lib/storage.ts`.

## Architecture and data flow
- Main flow: `src/app/page.tsx` (multi-step form) → saves `contestacao_form` in `localStorage` → routes to `src/app/revisar/page.tsx`.
- `src/app/revisar/page.tsx` calls `POST /api/gerar` and consumes a **streaming** text response chunk-by-chunk.
- `src/app/api/gerar/route.ts` builds prompt with `buildPrompt(data)` and sends to Anthropic with:
  - model `claude-opus-4-6`
  - `system` block using `CACHED_CONTEXT` + `cache_control: { type: "ephemeral" }`
- Prompt composition lives in `src/lib/prompt.ts` and delegates by dispute type to `src/lib/templates/*.ts`.
- Export flow:
  - `POST /api/exportar-docx` (`docx` package, server-side)
  - `POST /api/exportar-pdf` (returns print-optimized HTML, browser prints to PDF)

## Pagar.me integration boundaries
- API client + HMAC helpers are in `src/lib/pagarme.ts` (`PagarmeAPI`, `getPagarmeAPI`).
- Active API routes under `src/app/api/pagarme/*`:
  - `list-chargebacks/route.ts` fetches open chargebacks and enriches order/customer data.
  - `chargebacks/route.ts` receives webhook, validates HMAC, maps payload to `FormContestacao` draft.
  - `auto-respond/route.ts` is experimental batch auto-defense.
- Env vars used by integration: `PAGARME_API_KEY`, `PAGARME_WEBHOOK_SECRET`.
- Anthropic key required by `/api/gerar`: `ANTHROPIC_API_KEY`.

## Local conventions that matter
- Keep `FormContestacao` shape consistent across form, API routes, templates, and storage.
- Type names are semantic contracts: `desacordo_comercial`, `produto_nao_recebido`, `fraude`, `credito_nao_processado`.
- `buildPrompt()` API and `CACHED_CONTEXT` behavior are relied on by generation; avoid signature/structure drift.
- UI styling uses shared utility classes in `src/app/globals.css` (`btn-primary`, `btn-secondary`, `input`, `label`, `card`) and brand tokens from `tailwind.config.ts`.
- Auto-save contract keys in `storage.ts` should remain stable:
  - `contestacao_rascunhos`
  - `contestacao_form_autosave`
  - `contestacao_last_save_time`

## Developer workflows in this repo
- Install/run: `npm install`, `npm run dev`.
- Build for production check: `npm run build`.
- Start prod server: `npm run start`.
- There is no configured test/lint script in `package.json`; avoid assuming Jest/ESLint tasks exist.

## Practical guardrails for edits
- When adding form fields, update all dependent layers together: `src/types.ts` → `src/app/page.tsx` → templates in `src/lib/templates/` → any API mapping that serializes/deserializes form data.
- Preserve streaming behavior in `src/app/api/gerar/route.ts` and consumer logic in `src/app/revisar/page.tsx`; replacing with non-streaming changes UX.
- For webhook handlers, be careful with non-200 responses because payment providers may retry aggressively.