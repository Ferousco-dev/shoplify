import { NextResponse } from "next/server";
import { loadPrompt, render } from "@/lib/prompts";
import { fetchReferenceImage, geminiImage } from "@/lib/gemini";
import { higgsfieldImage, higgsfieldConfigured } from "@/lib/higgsfield";
import { stageUpload, uploadBytesToStaged } from "@/lib/shopify";
import { requireShopify } from "@/lib/session";
import { IMAGE_SLOTS, slotByShortKey } from "@/lib/slots";

export const runtime = "nodejs";
export const maxDuration = 120;

type Req = {
  shortKey: string;
  promptCtx: {
    title: string;
    attributes: Record<string, unknown>;
    category: string;
  };
  alt?: string;
  referenceImages?: string[];
  lifestylePrompt?: string;
  /** URL of the already-generated front/hero shot.
   *  When present it is prepended to referenceImages so Higgsfield/Gemini
   *  keeps the product visually consistent across all 14 slots. */
  heroImageUrl?: string;
};

export async function POST(req: Request) {
  let creds: { shopDomain: string; accessToken: string };
  try {
    creds = await requireShopify();
  } catch {
    return NextResponse.json(
      { error: "Not connected to Shopify" },
      { status: 401 },
    );
  }

  const body = (await req.json()) as Req;
  const slot = slotByShortKey(body.shortKey);
  if (!slot) {
    return NextResponse.json(
      {
        error: `Unknown slot. Valid keys: ${IMAGE_SLOTS.map((s) => s.shortKey).join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Build the prompt text
  let rendered: string;
  if (body.lifestylePrompt) {
    rendered = body.lifestylePrompt;
  } else {
    const prompt = await loadPrompt(slot.promptPath);
    rendered = render(prompt.body, {
      ...body.promptCtx,
      slot: { key: slot.shortKey, label: slot.label },
    });
  }

  // Reference image list: hero shot first (strongest visual anchor),
  // then supplier reference images.
  const refUrls: string[] = [
    ...(body.heroImageUrl ? [body.heroImageUrl] : []),
    ...(body.referenceImages || []),
  ];

  let imageBytes: Uint8Array;
  let imageMimeType: string;

  if (higgsfieldConfigured()) {
    // ── Higgsfield path ──────────────────────────────────────────────────────
    // Pass all reference URLs directly — Higgsfield does its own fetching and
    // uses them as visual anchors for product consistency.
    const result = await higgsfieldImage({
      prompt: rendered,
      referenceImageUrls: refUrls.slice(0, 4),
    });
    imageBytes = result.bytes;
    imageMimeType = result.mimeType;
  } else {
    // ── Gemini fallback ──────────────────────────────────────────────────────
    const refs: Array<{ bytes: Uint8Array; mimeType: string }> = [];
    for (const url of refUrls.slice(0, 3)) {
      try {
        refs.push(await fetchReferenceImage(url));
      } catch {
        /* skip unreachable reference */
      }
    }
    const img = await geminiImage({ prompt: rendered, referenceImages: refs });
    imageBytes = img.bytes;
    imageMimeType = img.mimeType;
  }

  // Stage-upload to Shopify CDN
  const filename =
    `${body.promptCtx.title || "product"}-${slot.shortKey}.${mimeExt(imageMimeType)}`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-");
  const target = await stageUpload(creds, {
    filename,
    mimeType: imageMimeType,
    bytesSize: imageBytes.length,
  });
  const resourceUrl = await uploadBytesToStaged(target, imageBytes, imageMimeType);

  const previewDataUrl = `data:${imageMimeType};base64,${Buffer.from(imageBytes).toString("base64")}`;

  return NextResponse.json({
    shortKey: slot.shortKey,
    label: slot.label,
    alt:
      body.alt ||
      slot.altPattern.replace("{{title}}", body.promptCtx.title || ""),
    resourceUrl,
    mimeType: imageMimeType,
    previewDataUrl,
  });
}

function mimeExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}
