"use client";

import { useState } from "react";
import type { ImportResponse } from "@/lib/types";

const DISPLAY_COLUMNS: { key: keyof ImportResponse["records"][number]; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "mobile_without_country_code", label: "Mobile" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "crm_status", label: "Status" },
  { key: "data_source", label: "Source" },
  { key: "crm_note", label: "Note" },
  { key: "created_at", label: "Created At" },
];

export default function ResultTable({
  result,
  onStartOver,
}: {
  result: ImportResponse;
  onStartOver: () => void;
}) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total rows" value={result.total_rows} />
        <StatCard label="Imported" value={result.total_imported} tone="good" />
        <StatCard label="Skipped" value={result.total_skipped} tone={result.total_skipped > 0 ? "warn" : "neutral"} />
        <StatCard
          label="Success rate"
          value={
            result.total_rows > 0
              ? `${Math.round((result.total_imported / result.total_rows) * 100)}%`
              : "—"
          }
        />
      </div>

      {result.warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {result.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
            Imported ({result.total_imported})
          </TabButton>
          <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
            Skipped ({result.total_skipped})
          </TabButton>
        </div>
        <button
          onClick={onStartOver}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Import another file
        </button>
      </div>

      {tab === "imported" ? (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {result.records.length === 0 ? (
            <EmptyState message="No records were successfully imported from this file." />
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                <tr>
                  {DISPLAY_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.records.map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-900/60">
                    {DISPLAY_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className="max-w-xs truncate whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                        title={r[c.key]}
                      >
                        {c.key === "crm_status" && r[c.key] ? (
                          <StatusPill status={r[c.key]} />
                        ) : (
                          r[c.key] || <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {result.skipped_records.length === 0 ? (
            <EmptyState message="Nothing was skipped — every row had an email or mobile number." />
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    Row Index
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.skipped_records.map((s, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-900/60">
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                      {s.index ?? "—"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                      {s.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    GOOD_LEAD_FOLLOW_UP: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    DID_NOT_CONNECT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    BAD_LEAD: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    SALE_DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || ""}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
