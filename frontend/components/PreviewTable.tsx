"use client";

type Props = {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function PreviewTable({
  headers,
  rows,
  fileName,
  rowCount,
  onConfirm,
  onCancel,
}: Props) {
  const previewRows = rows.slice(0, 50);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {fileName} · {rowCount} row{rowCount === 1 ? "" : "s"} detected
            {rowCount > previewRows.length && ` (showing first ${previewRows.length})`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Confirm &amp; Import
          </button>
        </div>
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr
                key={i}
                className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-900/60"
              >
                {headers.map((h) => (
                  <td
                    key={h}
                    className="max-w-xs truncate whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                    title={row[h]}
                  >
                    {row[h] || <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        No AI processing has happened yet. Click &ldquo;Confirm &amp; Import&rdquo; to send this data for extraction.
      </p>
    </div>
  );
}
