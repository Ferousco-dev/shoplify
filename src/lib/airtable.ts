const AIRTABLE_BASE = "https://api.airtable.com/v0";

export type AirtableWriteFields = {
  generatedTitle?: string;
  generatedDescription?: string;
  imageUrls?: string[];
  status?: string;
};

export async function writeBackToAirtable(opts: {
  pat: string;
  baseId: string;
  tableId: string;
  recordId: string;
  fields: AirtableWriteFields;
}): Promise<void> {
  const { pat, baseId, tableId, recordId, fields } = opts;

  const patchFields: Record<string, unknown> = {};

  if (fields.generatedTitle) {
    patchFields["Generated Title"] = fields.generatedTitle;
  }
  if (fields.generatedDescription) {
    patchFields["Generated Description"] = fields.generatedDescription;
  }
  if (fields.status) {
    patchFields["AI Status"] = fields.status;
  }
  if (fields.imageUrls?.length) {
    // Airtable attachment format: array of { url }
    patchFields["Generated Images"] = fields.imageUrls.map((url) => ({ url }));
  }

  const res = await fetch(`${AIRTABLE_BASE}/${baseId}/${tableId}/${recordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: patchFields }),
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
