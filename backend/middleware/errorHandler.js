import { FileValidationError } from "../validations/fileValidation.js";
import { CsvParseError } from "../services/csvParserService.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof FileValidationError || err instanceof CsvParseError) {
    return res.status(400).json({ error: err.message });
  }

  if (err && err.name === "MulterError") {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal error while processing the request.", detail: err.message });
}
