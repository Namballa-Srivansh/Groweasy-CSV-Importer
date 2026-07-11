import { parse } from "csv-parse/sync";

export function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    throw new CsvParseError("The CSV file is empty.");
  }

  let records;
  try {
    records = parse(csvText, {
      columns: true,         
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    throw new CsvParseError(`Could not parse CSV: ${err.message}`);
  }

  if (records.length === 0) {
    throw new CsvParseError("The CSV file has a header row but no data rows.");
  }

  const headers = Object.keys(records[0]);
  return { headers, records };
}

export class CsvParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "CsvParseError";
  }
}
