# Shoplify

AI product-listing generator for Shopify. Drop a CSV of supplier URLs (Amazon, AliExpress, Alibaba, 1688), get back AI-written copy + SEO + 15 on-brand images, push as drafts to your Shopify store.

Built with Next.js 15 App Router. Deploys to Vercel as serverless functions — no separate backend.

## Stack

- **Next.js 15** (App Router, Node runtime for API routes)
- **Supabase** — Postgres for jobs, products, assets, generations (uses service-role key server-side; RLS protects the rest)
- **AI fallback chain** — Claude (Sonnet 4.5) → Mistral (Large) → Groq (Llama 3.3 70B) → Gemini (Flash). Each tier is skipped automatically on credit / rate-limit / quota errors.
- **Gemini Flash Image** for the 14 product image slots (5 ecommerce + 3 lifestyle + 3 closeup + 3 UGC), plus 1 flatlay
- **Shopify Admin API** GraphQL for staged uploads + product creation

## Local development

```bash
cp .env.example .env.local
# fill in keys
npm install
npm run dev
```

Visit <http://localhost:3000>. Connect a Shopify custom-app token at `/dashboard/connect`, then upload a CSV at `/dashboard/new`.

## Deploy to Vercel

1. Push to GitHub (this repo).
2. In Vercel, "Import Project" → pick the repo.
3. **Set every variable from `.env.example`** under Project Settings → Environment Variables.
4. Deploy.

The pipeline runs entirely as Vercel functions. Long jobs are chained via `/api/jobs/[id]/run-next-row` which re-fires itself for each row, so a single function never has to outlive its 300s limit.

## Architecture notes

- **Background job runner.** `POST /api/jobs` creates a `jobs` row + `job_items` and fire-and-forgets a runner. The runner picks one pending row, runs the full pipeline (scrape → copy → SEO → 15 images), writes to Supabase, then re-fires itself for the next row. The browser is free to close at any point.
- **Per-provider AbortController.** Each AI call has a 90s wall-clock cap (configurable via `PROVIDER_TIMEOUT_MS`). A slow provider can't burn the whole budget.
- **Truncation-resilient JSON parsing.** `lib/claude.ts` tolerates LLM cuts mid-key, mid-value, or mid-string by walking back to the last safe property comma + balancing braces.
- **Prompts in `prompts/`.** 18 Markdown files driving copy, SEO, and per-slot image generation. Whitelisted in `next.config.js` `outputFileTracingIncludes` so the serverless bundle includes them.
