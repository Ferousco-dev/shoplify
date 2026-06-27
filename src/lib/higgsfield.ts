/**
 * Higgsfield AI image generation client.
 *
 * Uses the platform.higgsfield.ai API (v2).
 * Auth: single header  Authorization: Key {apiKey}:{secret}
 * Submit: POST https://platform.higgsfield.ai/{model_id}
 * Status: GET  https://platform.higgsfield.ai/requests/{id}/status
 *
 * Credentials: HIGGSFIELD_API_KEY + HIGGSFIELD_SECRET from .env
 * Docs: https://docs.higgsfield.ai
 */

const BASE = "https://platform.higgsfield.ai";
// Flagship text-to-image model on Higgsfield platform
const IMAGE_MODEL = "higgsfield-ai/soul/standard";
const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 120_000;

export type HiggsfieldImageResult = {
  bytes: Uint8Array;
  mimeType: string;
  mediaUrl: string;
};

function getCredentials(overrides?: { apiKey?: string; secret?: string }): { apiKey: string; secret: string } {
  const apiKey = overrides?.apiKey || process.env.HIGGSFIELD_API_KEY;
  const secret = overrides?.secret || process.env.HIGGSFIELD_SECRET;
  if (!apiKey || !secret) {
    throw new Error(
      "HIGGSFIELD_API_KEY and HIGGSFIELD_SECRET must be set in environment variables or user settings",
    );
  }
  return { apiKey, secret };
}

type SubmitResponse = {
  request_id?: string;
  status?: string;
  error?: string;
};

type StatusResponse = {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: string;
};

/**
 * Generate one image via Higgsfield.
 *
 * @param prompt  The full text prompt for this shot.
 * @param referenceImageUrls  URLs of reference images (supplier photos OR the
 *   previously-generated hero shot).
 */
export async function higgsfieldImage(opts: {
  prompt: string;
  referenceImageUrls?: string[];
  seed?: number;
  apiKey?: string;
  secret?: string;
}): Promise<HiggsfieldImageResult> {
  const { apiKey, secret } = getCredentials({ apiKey: opts.apiKey, secret: opts.secret });

  const reqBody: Record<string, unknown> = {
    prompt: opts.prompt,
    aspect_ratio: "1:1",
    resolution: "720p",
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
    submitRes = await fetch(`${BASE}/${IMAGE_MODEL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}:${secret}`,
      },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string } };
    throw new Error(`Higgsfield fetch failed: ${err.cause?.code ?? err.message}`);
  }

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`Higgsfield submit ${submitRes.status}: ${text.slice(0, 400)}`);
  }

  const submitted = (await submitRes.json()) as SubmitResponse;
  if (submitted.error) {
    throw new Error(`Higgsfield error: ${submitted.error}`);
  }

  const requestId = submitted.request_id;
  if (!requestId) {
    throw new Error("Higgsfield returned no request_id");
  }

  // Poll until completed or failed
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
      pollRes = await fetch(`${BASE}/requests/${requestId}/status`, {
        headers: {
          Authorization: `Key ${apiKey}:${secret}`,
        },
      });
    } catch {
      // transient network error — keep polling
      continue;
    }

    if (!pollRes.ok) {
      if (pollRes.status >= 400 && pollRes.status < 500) {
        throw new Error(`Higgsfield poll ${pollRes.status} for ${requestId}`);
      }
      continue;
    }

    const status = (await pollRes.json()) as StatusResponse;

    if (status.status === "completed") {
      const url = status.images?.[0]?.url ?? status.video?.url;
      if (!url) throw new Error("Higgsfield completed but no image URL in response");
      return url;
    }

    if (status.status === "failed" || status.status === "nsfw") {
      throw new Error(
        `Higgsfield generation ${status.status}: ${status.error ?? "unknown"}`,
      );
    }

    // queued / in_progress — keep waiting
  }

  throw new Error(`Higgsfield timed out after ${POLL_TIMEOUT_MS / 1000}s for ${requestId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Returns true when Higgsfield credentials are configured.
 * Checks session overrides first, then falls back to env vars.
 */
export function higgsfieldConfigured(overrides?: { apiKey?: string; secret?: string }): boolean {
  const apiKey = overrides?.apiKey || process.env.HIGGSFIELD_API_KEY;
  const secret = overrides?.secret || process.env.HIGGSFIELD_SECRET;
  return !!(apiKey && secret);
}
