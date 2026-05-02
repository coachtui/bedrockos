"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Download, ChevronRight, ChevronLeft, Check } from "lucide-react";
import {
  parseCSVText,
  detectMapping,
  mapRowsToTasks,
  FIELD_LABELS,
  EMPTY_MAPPING,
  CSV_TEMPLATE_EXAMPLE,
  type ColumnMapping,
} from "@/lib/cx/csv-import";
import type { CreateCxTaskInput } from "@/lib/cx/types";

type Step = "upload" | "map" | "preview";

interface CsvImportModalProps {
  open:      boolean;
  onClose:   () => void;
  projectId: string;
  onImport:  (tasks: CreateCxTaskInput[]) => void;
}

const FIELD_ORDER: Array<keyof ColumnMapping> = [
  "name", "externalId", "type", "startDate", "endDate", "location", "status", "notes",
];

export function CsvImportModal({ open, onClose, projectId, onImport }: CsvImportModalProps) {
  const [step,    setStep]    = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows,    setRows]    = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null, type: null, startDate: null, endDate: null,
    location: null, status: null, notes: null, externalId: null,
  });
  const [preview, setPreview] = useState<CreateCxTaskInput[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setHeaders([]); setRows([]); setPreview([]); setError(null);
    setMapping({ ...EMPTY_MAPPING });
  }

  function handleClose() { reset(); onClose(); }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "task-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const handleFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSVText(text);
      if (h.length === 0) { setError("File appears to be empty."); return; }
      setHeaders(h);
      setRows(r);
      setMapping(detectMapping(h));
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
    else setError("Please drop a .csv file.");
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function goToPreview() {
    if (mapping.name === null) { setError("You must map the Task Name column."); return; }
    setError(null);
    setPreview(mapRowsToTasks(rows, mapping, projectId));
    setStep("preview");
  }

  function handleConfirm() {
    onImport(preview);
    handleClose();
  }

  if (!open) return null;

  const fieldClass = "w-full bg-surface-overlay border border-surface-border rounded px-2 py-1.5 text-xs text-content-primary focus:outline-none focus:border-gold/50";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />
      <div className="relative z-10 w-full max-w-xl bg-surface-raised border border-surface-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-0.5">
              {step === "upload" ? "Step 1 of 3" : step === "map" ? "Step 2 of 3" : "Step 3 of 3"}
            </p>
            <h2 className="text-sm font-bold text-content-primary">
              {step === "upload" ? "Import Tasks · Upload CSV" : step === "map" ? "Map Columns" : "Preview & Confirm"}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded hover:bg-surface-overlay text-content-muted hover:text-content-primary transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-xs text-content-secondary leading-relaxed">
                Upload a CSV file exported from your scheduling spreadsheet. Each row becomes a task.
                Tasks without dates will be saved as drafts.
              </p>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">Expected Columns</p>
                <div className="bg-surface-overlay rounded-lg border border-surface-border px-3 py-2 font-mono text-[10px] text-content-muted">
                  task_id, name, type, start_date, end_date, location, status, notes
                </div>
                <p className="text-[10px] text-content-muted mt-1.5">
                  Column order doesn&apos;t matter — you&apos;ll map them in the next step.
                </p>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors font-semibold"
              >
                <Download size={13} /> Download Template CSV
              </button>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-surface-border hover:border-gold/40 rounded-xl py-10 flex flex-col items-center gap-2 cursor-pointer transition-colors"
              >
                <Upload size={20} className="text-content-muted" />
                <p className="text-sm font-semibold text-content-primary">Drop CSV here or click to browse</p>
                <p className="text-xs text-content-muted">.csv files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === "map" && (
            <div className="space-y-4">
              <p className="text-xs text-content-secondary">
                Detected <span className="font-semibold text-content-primary">{rows.length}</span> rows.
                Match your CSV columns to task fields below. Unneeded fields can be left as &ldquo;Skip&rdquo;.
              </p>

              <div className="space-y-3">
                {FIELD_ORDER.map((field) => (
                  <div key={field}>
                    <label className={labelClass}>
                      {FIELD_LABELS[field]}
                      {field === "name" && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      className={fieldClass}
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping((prev) => ({
                        ...prev,
                        [field]: e.target.value === "" ? null : Number(e.target.value),
                      }))}
                    >
                      <option value="">— Skip —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-3">
              <p className="text-xs text-content-secondary">
                <span className="font-semibold text-content-primary">{preview.length}</span> tasks ready to import.
                Tasks without dates will be saved as drafts.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3">Name</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3">Type</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3">Dates</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((t, i) => (
                      <tr key={i} className="border-b border-surface-border last:border-0">
                        <td className="py-2 pr-3 font-medium text-content-primary">{t.name}</td>
                        <td className="py-2 pr-3 text-content-muted capitalize">{t.type}</td>
                        <td className="py-2 pr-3">
                          {t.startDate
                            ? <span className="text-content-primary">{t.startDate}{t.endDate !== t.startDate ? ` → ${t.endDate}` : ""}</span>
                            : <span className="text-amber-400 font-semibold">Draft</span>
                          }
                        </td>
                        <td className="py-2 text-content-muted font-mono">{t.externalId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface-border flex-shrink-0">
          {step !== "upload" ? (
            <button
              onClick={() => setStep(step === "preview" ? "map" : "upload")}
              className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors font-semibold"
            >
              <ChevronLeft size={13} /> Back
            </button>
          ) : <div />}

          {step === "upload" && (
            <p className="text-[10px] text-content-muted">Select a file to continue</p>
          )}
          {step === "map" && (
            <button
              onClick={goToPreview}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              Preview <ChevronRight size={13} />
            </button>
          )}
          {step === "preview" && (
            <button
              onClick={handleConfirm}
              disabled={preview.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={13} /> Import {preview.length} Task{preview.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
