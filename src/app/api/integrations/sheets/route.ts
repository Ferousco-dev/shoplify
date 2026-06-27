import { NextResponse } from "next/server";
import { requireStore } from "@/lib/session";
import { generateWebhookSecret } from "@/lib/webhook-secret";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const origin = new URL(req.url).origin;
  const secret = generateWebhookSecret(auth.storeId);
  const webhookUrl = `${origin}/api/webhooks/sheets/${auth.storeId}`;

  return NextResponse.json({
    webhookUrl,
    secret,
    storeId: auth.storeId,
    appsScript: buildAppsScript(webhookUrl, secret),
  });
}

function buildAppsScript(webhookUrl: string, secret: string): string {
  return `/**
 * Alivio Plus — Google Sheets Auto-Trigger
 *
 * HOW TO INSTALL
 * 1. In your Google Sheet, go to Extensions → Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Click Save, then click Run → alivioSetup
 * 4. Accept the permissions dialog (one-time)
 * 5. Done! Every new or edited row will auto-generate products in Alivio Plus.
 */

var ALIVIO_WEBHOOK_URL = '${webhookUrl}';
var ALIVIO_SECRET = '${secret}';

function alivioSetup() {
  // Remove any previous triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'alivioOnEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Create a fresh onEdit trigger
  ScriptApp.newTrigger('alivioOnEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert(
    '✅ Alivio Plus connected!\\n\\nFrom now on, any row you add or update will automatically generate product content and push it to your Shopify store.'
  );
}

function alivioOnEdit(e) {
  var sheet = e.source.getActiveSheet();
  var row = e.range.getRow();

  // Ignore header row
  if (row <= 1) return;

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values  = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  var rowData = {};
  headers.forEach(function(h, i) {
    if (String(h).trim()) rowData[String(h).trim()] = String(values[i] || '');
  });

  // Skip completely empty rows
  var hasData = Object.values(rowData).some(function(v) { return String(v).trim() !== ''; });
  if (!hasData) return;

  try {
    UrlFetchApp.fetch(ALIVIO_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ secret: ALIVIO_SECRET, rows: [rowData] }),
      muteHttpExceptions: true
    });
  } catch(err) {
    Logger.log('Alivio: send failed — ' + err.message);
  }
}`;
}
