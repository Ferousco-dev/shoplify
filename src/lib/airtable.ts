const AIRTABLE_BASE = "https://api.airtable.com/v0";

// Maps pipeline slot short-keys to the client's exact Airtable column names.
// Slots without a matching column (flatlay, ugc_routine, ugc_use) are skipped.
const SLOT_TO_COLUMN: Record<string, string> = {
  front: "Front Hero_Image",
  three_quarter: "Three-Quarter_Image",
  profile: "Profile_view_Image",
  birds_eye: "Birds_Eye_Image",
  scale_correct: "Scale-Correct_Lifestyle_Image_url",
  human_perspective: "Human_Perspective_Image",
  ambient: "Ambient_Lifestyle_Image",
  rear: "Rear_Base_Image",
  texture: "Texture_Detail_Image",
  functional: "Functional_Detail_Image",
  branding: "Branding_Detail_Image",
};

export type SlotImageMap = Record<string, string>; // shortKey → public_url

export async function writeBackToAirtable(opts: {
  pat: string;
  baseId: string;
  tableId: string;
  recordId: string;
  slotImages: SlotImageMap;
  status?: string;
}): Promise<void> {
  const { pat, baseId, tableId, recordId, slotImages, status } = opts;

  const fields: Record<string, unknown> = {};

  // Write each slot to its dedicated Airtable attachment column
  for (const [slot, url] of Object.entries(slotImages)) {
    const col = SLOT_TO_COLUMN[slot];
    if (col && url) {
      fields[col] = [{ url }];
    }
  }

  if (status) {
    fields["Status"] = status;
  }

  if (Object.keys(fields).length === 0) return;

  const res = await fetch(`${AIRTABLE_BASE}/${baseId}/${tableId}/${recordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable PATCH ${res.status}: ${text.slice(0, 300)}`);
  }
}

export function airtableConfigured(creds: {
  pat?: string;
  baseId?: string;
  tableId?: string;
}): boolean {
  return !!(creds.pat && creds.baseId && creds.tableId);
}
