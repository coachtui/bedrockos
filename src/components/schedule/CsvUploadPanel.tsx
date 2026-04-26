"use client";

import React, { useState, useRef } from "react";
import { Upload, ArrowRight } from "lucide-react";
import type { ColumnMap } from "@/lib/schedule/types";
import { parseCSVText, detectColumnMap } from "@/lib/schedule/csv-parser";

const REQUIRED_FIELDS: Array<{ key: keyof ColumnMap; label: string; required: boolean }> = [
  { key: "activityName", label: "Activity Name", required: true  },
  { key: "phase",        label: "Phase",         required: true  },
  { key: "startDate",    label: "Start Date",    required: true  },
  { key: "endDate",      label: "End Date",      required: true  },
  { key: "duration",     label: "Duration",      required: false },
];

interface Props {
  projectId: string;
  onUpload:  (csvText: string, columnMap: ColumnMap) => void;
  onCancel:  () => void;
}

export function CsvUploadPanel({ onUpload, onCancel }: Props) {
  const [step,      setStep]      = useState<"upload" | "map">("upload");
  const [csvText,   setCsvText]   = useState("");
  const [headers,   setHeaders]   = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Partial<ColumnMap>>({});
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file. Export your spreadsheet as CSV first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVText(text);
      if (rows.length < 2) {
        setError("The CSV appears to be empty or has no data rows.");
        return;
      }
      const detected = detectColumnMap(rows[0]);
      setCsvText(text);
      setHeaders(rows[0]);
      setColumnMap(detected);
      setStep("map");
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    const map = columnMap as ColumnMap;
    if (!map.activityName || !map.phase || !map.startDate || !map.endDate) {
      setError("Please map all required fields before importing.");
      return;
    }
    onUpload(csvText, map);
  }

  if (step === "upload") {
    return (
      <div className="p-6">
        <p className="text-sm font-semibold text-content-primary mb-1">Upload Project Schedule</p>
        <p className="text-xs text-content-muted mb-4">
          Export your schedule from Excel, Smartsheet, or Procore as a CSV, then upload here.
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-surface-border-hover rounded-[var(--radius-card)] p-8 text-center cursor-pointer hover:border-teal/40 hover:bg-teal/5 transition-colors"
        >
          <Upload size={20} className="mx-auto mb-2 text-content-muted" />
          <p className="text-sm text-content-secondary font-medium">Drop CSV here or click to browse</p>
          <p className="text-xs text-content-muted mt-1">Excel → File → Save As → CSV</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {error && <p className="mt-3 text-xs text-status-critical">{error}</p>}
        <button onClick={onCancel} className="mt-4 text-xs text-content-muted hover:text-content-secondary">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-sm font-semibold text-content-primary mb-1">Map Your Columns</p>
      <p className="text-xs text-content-muted mb-4">
        We detected {headers.length} columns. Map them to schedule fields below.
      </p>
      <div className="space-y-3">
        {REQUIRED_FIELDS.map(({ key, label, required }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-content-secondary w-32 shrink-0">
              {label}
              {required && <span className="text-status-critical ml-0.5">*</span>}
            </span>
            <select
              value={columnMap[key] ?? ""}
              onChange={(e) => setColumnMap((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
              className="flex-1 text-xs bg-surface-raised border border-surface-border rounded px-2 py-1.5 text-content-primary focus:outline-none focus:border-teal/50"
            >
              <option value="">— select column —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-status-critical">{error}</p>}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Import Schedule <ArrowRight size={13} />
        </button>
        <button onClick={() => setStep("upload")} className="text-xs text-content-muted hover:text-content-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
