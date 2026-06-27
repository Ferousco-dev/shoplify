/**
 * Higgsfield AI image generation client.
 *
 * Higgsfield generates cinematic, consistent product images. The key pattern
 * for product consistency: generate the front/hero shot first, then pass its
 * output URL as the first reference image for all remaining slots — Higgsfield
 * will keep the product appearance identical across every shot.
 *
 * Credentials: HIGGSFIELD_API_KEY + HIGGSFIELD_SECRET from .env
 * Docs: https://cloud.higgsfield.ai/api-keys
 */

const BASE = "https://cloud.higgsfield.ai";
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

export type HiggsfieldImageResult = {
  bytes: Uint8Array;
  mimeType: string;
  mediaUrl: string;
};

function getCredentials(): { apiKey: string; secret: string } {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const secret = process.env.HIGGSFIELD_SECRET;
  if (!apiKey || !secret) {
    throw new Error(
      "HIGGSFIELD_API_KEY and HIGGSFIELD_SECRET must be set in environment variables",
    );
  }
  return { apiKey, secret };
}

type SubmitResponse = {
  request_id?: string;
  id?: string;
  status?: string;
  error?: string;
  message?: string;
};

type StatusResponse = {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  output?: {
    media_url?: string;
    url?: string;
  };
  media_url?: string;
  error?: string;
  message?: string;
};

/**
 * Generate one image via Higgsfield.
 *
 * @param prompt  The full text prompt for this shot.
 * @param referenceImageUrls  URLs of reference images (supplier photos OR the
 *   previously-generated hero shot). Pass hero shot URL first for maximum
 *   product consistency.
 */
export async function higgsfieldImage(opts: {
  prompt: string;
  referenceImageUrls?: string[];
  seed?: number;
}): Promise<HiggsfieldImageResult> {
  const { apiKey, secret } = getCredentials();

  // Build the request body. Higgsfield accepts image_urls for reference-based
  // generation which is what gives us cross-shot product consistency.
  const reqBody: Record<string, unknown> = {
    prompt: opts.prompt,
    enhance_prompt: false,
    check_nsfw: false,
    quality: "high",
  };

  if (opts.referenceImageUrls?.length) {
    reqBody.image_urls = opts.referenceImageUrls.slice(0, 4);
  }
  if (opts.seed !== undefined) {
    reqBody.seed = opts.seed;
  }

  // Submit generation request
  let submitRes: Response;
  try {
    submitRes = await fetch(`${BASE}/ai-model-api/v1/flux-dev-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-secret": secret,
      },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    throw new Error(
      `Higgsfield fetch failed: ${err.cause?.code ?? err.message}`,
    );
  }

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`Higgsfield submit ${submitRes.status}: ${text.slice(0, 400)}`);
  }

  const submitted = (await submitRes.json()) as SubmitResponse;
  if (submitted.error || submitted.message?.toLowerCase().includes("error")) {
    throw new Error(`Higgsfield error: ${submitted.error ?? submitted.message}`);
  }

  const requestId = submitted.request_id ?? submitted.id;
  if (!requestId) {
    throw new Error("Higgsfield returned no request_id");
  }

  // Poll until COMPLETED or FAILED
  const mediaUrl = await pollUntilDone(requestId, apiKey, secret);

  // Download the image bytes
  const imgRes = await fetch(mediaUrl);
  if (!imgRes.ok) {
    throw new Error(`Higgsfield image download failed: HTTP ${imgRes.status}`);
  }
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  const mimeType =
    imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";

  return { bytes, mimeType, mediaUrl };
}

async function pollUntilDone(
  requestId: string,
  apiKey: string,
  secret: string,
): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let pollRes: Response;
    try {
      pollRes = await fetch(`${BASE}/v2/requests/status/${requestId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "x-api-secret": secret,
        },
      });
    } catch (e) {
      // transient network error — keep polling
      continue;
    }

    if (!pollRes.ok) {
      // 4xx means the request is gone or invalid — don't keep polling
      if (pollRes.status >= 400 && pollRes.status < 500) {
        throw new Error(`Higgsfield poll ${pollRes.status} for ${requestId}`);
      }
      continue;
    }

    const status = (await pollRes.json()) as StatusResponse;

    if (status.status === "COMPLETED") {
      const url =
        status.output?.media_url ??
        status.output?.url ??
        status.media_url;
      if (!url) throw new Error("Higgsfield COMPLETED but no media_url");
      return url;
    }

    if (status.status === "FAILED") {
      throw new Error(
        `Higgsfield generation failed: ${status.error ?? status.message ?? "unknown"}`,
      );
    }

    // PENDING / PROCESSING — keep waiting
  }

  throw new Error(`Higgsfield timed out after ${POLL_TIMEOUT_MS / 1000}s for ${requestId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Returns true when Higgsfield credentials are configured.
 * Used to decide at runtime whether to use Higgsfield or fall back to Gemini.
 */
export function higgsfieldConfigured(): boolean {
  return !!(process.env.HIGGSFIELD_API_KEY && process.env.HIGGSFIELD_SECRET);
}
