"use client";

import { useState } from "react";
import Papa from "papaparse";
import UploadStep from "@/components/UploadStep";
import PreviewTable from "@/components/PreviewTable";
import ResultTable from "@/components/ResultTable";
import { importCsv } from "@/lib/api";
import type { ImportResponse, Step } from "@/lib/types";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  function handleFileSelected(selected: File) {
    setUploadError(null);

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Please upload a .csv file.");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setUploadError("File is too large. Max size is 5MB.");
      return;
    }

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data as Record<string, string>[];
        if (parsedRows.length === 0) {
          setUploadError("This CSV has a header row but no data rows.");
          return;
        }
        setFile(selected);
        setHeaders(results.meta.fields || []);
        setRows(parsedRows);
        setStep("preview");
      },
      error: (err) => {
        setUploadError(`Could not parse this CSV: ${err.message}`);
      },
    });
  }

  async function handleConfirm() {
    if (!file) return;
    setStep("processing");
    setProcessingError(null);
    try {
      const res = await importCsv(file);
      setResult(res);
      setStep("result");
    } catch (err: any) {
      setProcessingError(err.message || "Something went wrong while importing.");
      setStep("preview");
    }
  }

  function handleStartOver() {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setResult(null);
    setUploadError(null);
    setProcessingError(null);
    setStep("upload");
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                GrowEasy CSV Importer
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Upload any CSV export and let AI map it into CRM leads.
              </p>
            </div>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </header>

          <Stepper current={step} />

          <div className="mt-8">
            {step === "upload" && (
              <UploadStep onFileSelected={handleFileSelected} error={uploadError} />
            )}

            {step === "preview" && file && (
              <>
                {processingError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                    {processingError}
                  </div>
                )}
                <PreviewTable
                  headers={headers}
                  rows={rows}
                  fileName={file.name}
                  rowCount={rows.length}
                  onConfirm={handleConfirm}
                  onCancel={handleStartOver}
                />
              </>
            )}

            {step === "processing" && <ProcessingState />}

            {step === "result" && result && (
              <ResultTable result={result} onStartOver={handleStartOver} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "preview", label: "Preview" },
    { key: "processing", label: "Processing" },
    { key: "result", label: "Result" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold
              ${
                i < currentIndex
                  ? "bg-brand-500 text-white"
                  : i === currentIndex
                  ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500 dark:bg-brand-700/30 dark:text-brand-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
              }`}
          >
            {i + 1}
          </span>
          <span
            className={
              i === currentIndex
                ? "font-medium text-slate-900 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-600"
            }
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-slate-200 dark:bg-slate-800" />}
        </li>
      ))}
    </ol>
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        AI is mapping your CSV to CRM fields…
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Larger files are processed in batches, this can take a moment.
      </p>
    </div>
  );
}
