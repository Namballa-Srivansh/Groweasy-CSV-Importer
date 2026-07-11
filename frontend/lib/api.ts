import type { ImportResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export async function importCsv(file: File): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/import`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error || `Import failed with status ${res.status}`);
  }

  return res.json();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
