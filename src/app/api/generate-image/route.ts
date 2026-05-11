import { NextResponse } from "next/server";
import { loadPrompt, render } from "@/lib/prompts";
import { fetchReferenceImage, geminiImage } from "@/lib/gemini";
import { stageUpload, uploadBytesToStaged } from "@/lib/shopify";
import { requireShopify } from "@/lib/session";
import { IMAGE_SLOTS, slotByShortKey } from "@/lib/slots";

export const runtime = "nodejs";
export const maxDuration = 90;

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

  // 1. Render the prompt template (or use pre-generated lifestyle prompt)
  let rendered: string;
  if (body.lifestylePrompt) {
    // Use the dynamically generated lifestyle prompt from Claude
    rendered = body.lifestylePrompt;
  } else {
    // Load and render the standard template
    const prompt = await loadPrompt(slot.promptPath);
    rendered = render(prompt.body, {
      ...body.promptCtx,
      slot: { key: slot.shortKey, label: slot.label },
    });
  }

  // 2. Pull reference images (Gemini uses these as visual anchors so generated
  //    images stay consistent with the actual product). Cap at 3, ignore failures.
  const refs: Array<{ bytes: Uint8Array; mimeType: string }> = [];
  for (const url of (body.referenceImages || []).slice(0, 3)) {
    try {
      refs.push(await fetchReferenceImage(url));
    } catch {
      /* skip */
    }
  }

  // 3. Generate
  const img = await geminiImage({ prompt: rendered, referenceImages: refs });

  // 4. Stage upload to Shopify, returning a resourceUrl we can pass into productCreate.
  const filename =
    `${body.promptCtx.title || "product"}-${slot.shortKey}.${mimeExt(img.mimeType)}`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-");
  const target = await stageUpload(creds, {
    filename,
    mimeType: img.mimeType,
    bytesSize: img.bytes.length,
  });
  const resourceUrl = await uploadBytesToStaged(
    target,
    img.bytes,
    img.mimeType,
  );

  // 5. Also return a data URL so the browser can show a preview without a separate fetch.
  const previewDataUrl = `data:${img.mimeType};base64,${bytesToBase64(img.bytes)}`;

  return NextResponse.json({
    shortKey: slot.shortKey,
    label: slot.label,
    alt:
      body.alt ||
      slot.altPattern.replace("{{title}}", body.promptCtx.title || ""),
    resourceUrl,
    mimeType: img.mimeType,
    previewDataUrl,
  });
}

function mimeExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
