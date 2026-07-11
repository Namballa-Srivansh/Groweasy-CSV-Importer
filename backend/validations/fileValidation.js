export class FileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FileValidationError";
  }
}

export function validateUploadedFile(file) {
  if (!file) {
    throw new FileValidationError("No file uploaded. Attach a CSV under field name 'file'.");
  }

  const name = (file.originalname || "").toLowerCase();
  if (!name.endsWith(".csv")) {
    throw new FileValidationError("Only .csv files are supported.");
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new FileValidationError("Uploaded file is empty.");
  }

  return true;
}
