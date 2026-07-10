import { parseCsv } from "../services/csvParserService.js";
import { splitIntoBatches, processBatch } from "../services/aiExtractionService.js";
import { sanitizeRecord } from "../validations/recordValidation.js";
import { validateUploadedFile } from "../validations/fileValidation.js";

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "25", 10);

export async function handleImport(req, res, next) {
  try {
    validateUploadedFile(req.file);

    const csvText = req.file.buffer.toString("utf-8");
    const { headers, records } = parseCsv(csvText);

    const batches = splitIntoBatches(records, BATCH_SIZE);
    const imported = [];
    const skipped = [];
    let anyBatchFailed = false;

    for (let i = 0; i < batches.length; i++) {
      const batchOffset = i * BATCH_SIZE;
      const result = await processBatch(batches[i], batchOffset);

      if (result.failed) anyBatchFailed = true;

      for (const raw of result.records) {
        const clean = sanitizeRecord(raw);
        if (clean) {
          imported.push(clean);
        } else {
          skipped.push({ reason: "failed post-validation (no email/phone)" });
        }
      }
      skipped.push(...result.skipped);
    }

    return res.json({
      total_rows: records.length,
      total_imported: imported.length,
      total_skipped: skipped.length,
      records: imported,
      skipped_records: skipped,
      warnings: anyBatchFailed
        ? ["One or more batches failed after retries; affected rows were marked as skipped rather than dropped silently."]
        : [],
      source_headers: headers,
    });
  } catch (err) {
    next(err);
  }
}

export async function handlePreview(req, res, next) {
  try {
    validateUploadedFile(req.file);

    const csvText = req.file.buffer.toString("utf-8");
    const { headers, records } = parseCsv(csvText);

    return res.json({ headers, rows: records, total_rows: records.length });
  } catch (err) {
    next(err);
  }
}
