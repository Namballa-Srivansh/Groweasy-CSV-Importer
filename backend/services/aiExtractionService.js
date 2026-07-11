import OpenAI from "openai";
import {
  CRM_FIELDS,
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
  FIELD_DESCRIPTIONS,
} from "../models/CrmRecord.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
});
const MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";
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
7. SKIP a row entirely (do not include it in "records") ONLY if it has NEITHER a usable email NOR a usable mobile number. Instead list its 0-based input index in "skipped_indices" with a short "reason".
8. IMPORTANT — crm_status and the skip decision are COMPLETELY INDEPENDENT. Whether a row has an email is irrelevant to crm_status; whether a row is a "bad lead" is irrelevant to whether it should be skipped. Determine crm_status purely from the row's notes/remarks/status text (does it describe interest, disinterest, a completed sale, or no contact made?). Determine skip purely from whether email OR phone exists. A row can have only a phone number (no email) and still be a confident SALE_DONE if its notes say so — missing contact fields are never evidence of a bad lead.
9. Never fabricate data that is not present or reasonably inferable in the row.
10. Output must fit on a single logical record each — no literal newlines inside string values; escape them as \\n if unavoidable.
11. Every row must end up in EXACTLY ONE place: either as one object in "records" (with its correct "source_index") or as one entry in "skipped_indices" — never both, never neither, and never with a source_index/index that doesn't match its actual position in the input.

FEW-SHOT EXAMPLES OF FIELD MAPPING (input headers vary, meaning stays the same):

Example A — Facebook Lead Ads style export:
Input row (source_index 0): {"full_name": "Aditi Rao", "email_address": "aditi.rao@gmail.com, aditi.work@company.com", "phone_number": "9123456780 / 9123456781", "created_time": "2026-06-01T10:15:00Z", "ad_name": "Sarjapur Plots Q2 Launch", "campaign_status": "Interested, call back tomorrow"}
Output: {"source_index": 0, "created_at": "2026-06-01 10:15:00", "name": "Aditi Rao", "email": "aditi.rao@gmail.com", "country_code": "+91", "mobile_without_country_code": "9123456780", "company": "", "city": "", "state": "", "country": "", "lead_owner": "", "crm_status": "GOOD_LEAD_FOLLOW_UP", "crm_note": "Additional email: aditi.work@company.com. Additional phone: 9123456781. Interested, call back tomorrow.", "data_source": "sarjapur_plots", "possession_time": "", "description": ""}

Example B — bare-bones manually created sheet with ambiguous headers:
Input row (source_index 1): {"Contact": "Ramesh - 9988776655", "Notes": "Not interested, budget mismatch"}
Output: {"source_index": 1, "created_at": "", "name": "Ramesh", "email": "", "country_code": "+91", "mobile_without_country_code": "9988776655", "company": "", "city": "", "state": "", "country": "", "lead_owner": "", "crm_status": "BAD_LEAD", "crm_note": "Not interested, budget mismatch", "data_source": "", "possession_time": "", "description": ""}

Example C — row that must be skipped (no email, no phone):
Input row (source_index 2): {"Name": "Unknown Visitor", "Page Viewed": "pricing", "Notes": "Just browsed, no contact info"}
This row has no email and no phone -> exclude from "records", add {"index": 2, "reason": "no email or mobile number"} to "skipped_indices".

Example D — phone only, but a clearly completed sale (crm_status is NOT downgraded just because email is missing):
Input row (source_index 3): {"Name": "Sneha Kapoor", "Phone": "9876500123", "Notes": "Deal closed, onboarding started"}
Output: {"source_index": 3, "created_at": "", "name": "Sneha Kapoor", "email": "", "country_code": "+91", "mobile_without_country_code": "9876500123", "company": "", "city": "", "state": "", "country": "", "lead_owner": "", "crm_status": "SALE_DONE", "crm_note": "Deal closed, onboarding started", "data_source": "", "possession_time": "", "description": ""}
(This row IS included in "records" — it has a phone number, so rule 7 does not apply — and crm_status is SALE_DONE because the notes clearly say so, per rule 8.)

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no commentary, exactly this shape:
{
  "records": [ { "source_index": <0-based index within this batch>, <schema fields as above> }, ... ],
  "skipped_indices": [ { "index": <0-based index within this batch>, "reason": "<short reason>" }, ... ]
}`;
}

function buildUserPrompt(rows) {
  const indexedRows = rows.map((row, i) => ({ source_index: i, ...row }));
  return `Map the following ${rows.length} CSV rows to the GrowEasy CRM schema per the rules in your system prompt. Each input row already carries its own "source_index" — echo that same value back on the matching output record or skip entry. Return JSON only.

INPUT ROWS:
${JSON.stringify(indexedRows, null, 0)}`;
}

function buildResponseSchema() {
  const recordProperties = { source_index: { type: "integer" } };
  for (const field of CRM_FIELDS) {
    if (field === "crm_status") {
      recordProperties[field] = { type: "string", enum: [...ALLOWED_CRM_STATUS, ""] };
    } else if (field === "data_source") {
      recordProperties[field] = { type: "string", enum: [...ALLOWED_DATA_SOURCE, ""] };
    } else {
      recordProperties[field] = { type: "string" };
    }
  }

  return {
    name: "crm_extraction_result",
    strict: true,
    schema: {
      type: "object",
      properties: {
        records: {
          type: "array",
          items: {
            type: "object",
            properties: recordProperties,
            required: ["source_index", ...CRM_FIELDS],
            additionalProperties: false,
          },
        },
        skipped_indices: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer" },
              reason: { type: "string" },
            },
            required: ["index", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["records", "skipped_indices"],
      additionalProperties: false,
    },
  };
}

// ----------------------------------------------------------- Batch splitting ------------------------------------------------------

export function splitIntoBatches(records, batchSize) {
  const batches = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }
  return batches;
}

// ------------------------------------------------------------- Single batch call with retry -----------------------------------------

async function callModelOnce(rows) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(rows) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: buildResponseSchema(),
    },

    provider: { require_parameters: true },
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`Model refused the request: ${message.refusal}`);
  }

  const text = message?.content;
  if (!text) throw new Error("Model returned no content.");

  let parsed;
  try {
    parsed = JSON.parse(text);
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
      return reconcile(rows, records, skipped, batchOffset);
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

function reconcile(rows, rawRecords, rawSkipped, batchOffset) {
  const seenIndices = new Set();
  const records = [];

  for (const rec of rawRecords) {
    const idx = rec.source_index;
    if (typeof idx !== "number" || idx < 0 || idx >= rows.length || seenIndices.has(idx)) {
      continue; // out-of-range or duplicate source_index — drop defensively
    }
    seenIndices.add(idx);
    const { source_index, ...crmFields } = rec;
    records.push(crmFields);
  }

  const skipped = [];
  for (const s of rawSkipped) {
    if (typeof s.index !== "number" || s.index < 0 || s.index >= rows.length) continue;
    if (seenIndices.has(s.index)) continue; // already have a real record for this row — record wins
    seenIndices.add(s.index);
    skipped.push({ index: batchOffset + s.index, reason: s.reason || "skipped by model" });
  }

  for (let i = 0; i < rows.length; i++) {
    if (!seenIndices.has(i)) {
      skipped.push({ index: batchOffset + i, reason: "not returned by model (reconciliation safety net)" });
    }
  }

  return { records, skipped, failed: false };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}