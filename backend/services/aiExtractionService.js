import { GoogleGenAI } from "@google/genai";
import {
  CRM_FIELDS,
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
  FIELD_DESCRIPTIONS,
} from "../models/CrmRecord.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "2", 10);


function buildSystemPrompt() {
  const fieldList = CRM_FIELDS.map(
    (f) => `- ${f}: ${FIELD_DESCRIPTIONS[f]}`
  ).join("\n");

  return `You are a data-mapping engine for GrowEasy CRM. You receive raw CSV rows
exported from arbitrary sources (Facebook Lead Ads, Google Ads, Excel sheets,
real-estate CRMs, sales reports, manually created spreadsheets, etc). Column
names and layouts vary wildly between sources and are NEVER guaranteed to
match the target schema. Your job is to intelligently map each input row to
the GrowEasy CRM schema below, using context and meaning, not just exact
header-name matches.

TARGET SCHEMA (return exactly these keys for every record, use "" for unknown):
${fieldList}

STRICT RULES:
1. crm_status must be exactly one of: ${ALLOWED_CRM_STATUS.join(", ")} — or "" if nothing in the row confidently indicates one of these. Never invent a value outside this list.
2. data_source must be exactly one of: ${ALLOWED_DATA_SOURCE.join(", ")} — or "" if nothing matches confidently. Never invent a value outside this list.
3. created_at must be normalised to an ISO-ish string parseable by JavaScript's \`new Date()\`, e.g. "2026-05-13 14:20:48". If no date is present, use "".
4. If a row has multiple emails: put the first in "email", append the rest into "crm_note" (e.g. "Additional email: x@y.com").
5. If a row has multiple phone numbers: put the first in "mobile_without_country_code" (digits only, no country code), append the rest into "crm_note".
6. Use crm_note for any remarks, follow-up notes, extra comments, extra contact info, or useful info that doesn't fit another field.
7. SKIP a row entirely (do not include it in "records") if it has NEITHER a usable email NOR a usable mobile number. Instead list its 0-based input index in "skipped_indices" with a short "reason".
8. Never fabricate data that is not present or reasonably inferable in the row.
9. Output must fit on a single logical record each — no literal newlines inside string values; escape them as \\n if unavoidable.

FEW-SHOT EXAMPLES OF FIELD MAPPING (input headers vary, meaning stays the same):

Example A — Facebook Lead Ads style export:
Input row: {"full_name": "Aditi Rao", "email_address": "aditi.rao@gmail.com, aditi.work@company.com", "phone_number": "9123456780 / 9123456781", "created_time": "2026-06-01T10:15:00Z", "ad_name": "Sarjapur Plots Q2 Launch", "campaign_status": "Interested, call back tomorrow"}
Output: {"created_at": "2026-06-01 10:15:00", "name": "Aditi Rao", "email": "aditi.rao@gmail.com", "country_code": "+91", "mobile_without_country_code": "9123456780", "company": "", "city": "", "state": "", "country": "", "lead_owner": "", "crm_status": "GOOD_LEAD_FOLLOW_UP", "crm_note": "Additional email: aditi.work@company.com. Additional phone: 9123456781. Interested, call back tomorrow.", "data_source": "sarjapur_plots", "possession_time": "", "description": ""}

Example B — bare-bones manually created sheet with ambiguous headers:
Input row: {"Contact": "Ramesh - 9988776655", "Notes": "Not interested, budget mismatch"}
Output: {"created_at": "", "name": "Ramesh", "email": "", "country_code": "+91", "mobile_without_country_code": "9988776655", "company": "", "city": "", "state": "", "country": "", "lead_owner": "", "crm_status": "BAD_LEAD", "crm_note": "Not interested, budget mismatch", "data_source": "", "possession_time": "", "description": ""}

Example C — row that must be skipped (no email, no phone):
Input row: {"Name": "Unknown Visitor", "Page Viewed": "pricing", "Notes": "Just browsed, no contact info"}
This row has no email and no phone -> exclude from "records", add its index to "skipped_indices" with reason "no email or mobile number".

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no commentary, exactly this shape:
{
  "records": [ { <schema fields as above> }, ... ],
  "skipped_indices": [ { "index": <0-based index within this batch>, "reason": "<short reason>" }, ... ]
}`;
}

function buildUserPrompt(rows) {
  return `Map the following ${rows.length} CSV rows (0-based indices as given) to the GrowEasy CRM schema per the rules in your system prompt. Return JSON only.

INPUT ROWS:
${JSON.stringify(rows, null, 0)}`;
}

// -------------------------------Batch Splitting---------------------------------------

export function splitIntoBatches(records, batchSize) {
  const batches = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }
  return batches;
}

// --------------------------- Single batch call with retry -----------------------------------------

async function callModelOnce(rows) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildUserPrompt(rows),
    config: {
      systemInstruction: buildSystemPrompt(),
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("Model returned no text content.");

  const cleaned = textBlock.text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Model returned non-JSON output: ${err.message}`);
  }

  if (!Array.isArray(parsed.records)) {
    throw new Error("Model output missing 'records' array.");
  }

  return {
    records: parsed.records,
    skipped: Array.isArray(parsed.skipped_indices) ? parsed.skipped_indices : [],
  };
}

export async function processBatch(rows, batchOffset) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { records, skipped } = await callModelOnce(rows);
      return {
        records,
        skipped: skipped.map((s) => ({
          index: batchOffset + s.index,
          reason: s.reason,
        })),
        failed: false,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(500 * Math.pow(2, attempt)); // exponential backoff
      }
    }
  }

  return {
    records: [],
    skipped: rows.map((_, i) => ({
      index: batchOffset + i,
      reason: `AI batch failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message || "unknown error"}`,
    })),
    failed: true,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
