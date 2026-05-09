"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { CreateCrewInput } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (crewId: string) => void;
}

type Step = "details" | "workers";

const EXIT_MS = 250;

export function CreateCrewModal({ onClose, onCreated }: Props) {
  const { projects, workers, addCrew, currentProject } = useOrg();

  const [open, setOpen]               = useState(true);
  const [step, setStep]               = useState<Step>("details");
  const [name, setName]               = useState("");
  const [projectId, setProjectId]     = useState(currentProject.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError]             = useState("");

  function close() {
    setOpen(false);
    window.setTimeout(onClose, EXIT_MS);
  }

  function toggleWorker(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Crew name is required."); return; }
    setError("");
    setStep("workers");
  }

  function handleSubmit() {
    const input: CreateCrewInput = {
      name:      name.trim(),
      projectId,
      memberIds: Array.from(selectedIds),
    };
    const crew = addCrew(input);
    setOpen(false);
    window.setTimeout(() => {
      onCreated(crew.id);
      onClose();
    }, EXIT_MS);
  }

  const projectWorkers = workers.filter(
    (w) => !w.projectId || w.projectId === projectId,
  );

  const header = (
    <div>
      <h2 className="text-base md:text-sm font-semibold text-content-primary">Create Crew</h2>
      <p className="text-xs text-content-muted mt-0.5">
        Step {step === "details" ? "1" : "2"} of 2 — {step === "details" ? "Crew details" : "Assign workers"}
      </p>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={close} title={header} ariaLabel="Create Crew">
      {step === "details" && (
        <form onSubmit={handleDetailsNext} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Crew Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Structural Crew T-5"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSelectedIds(new Set());
              }}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className="min-h-11 px-4 py-2 text-sm md:text-xs text-content-secondary hover:text-content-primary active:opacity-70 transition-colors">
              Cancel
            </button>
            <button type="submit" className="min-h-11 px-4 py-2 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold-hover active:opacity-80 transition-colors">
              Next: Assign Workers
            </button>
          </div>
        </form>
      )}

      {step === "workers" && (
        <div className="px-5 py-4">
          <p className="text-xs text-content-muted mb-3">
            {selectedIds.size} worker{selectedIds.size !== 1 ? "s" : ""} selected
          </p>
          <div className="space-y-1 max-h-[40vh] md:max-h-64 overflow-y-auto">
            {projectWorkers.map((worker) => {
              const selected = selectedIds.has(worker.id);
              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => toggleWorker(worker.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded text-left transition-colors active:opacity-80 ${
                    selected
                      ? "bg-gold/10 border border-gold/30"
                      : "bg-surface-overlay border border-transparent hover:border-surface-border"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-content-primary">{worker.name}</p>
                    <p className="text-xs text-content-muted capitalize">{worker.role}</p>
                  </div>
                  {selected && <Check size={14} className="text-gold shrink-0" />}
                </button>
              );
            })}
            {projectWorkers.length === 0 && (
              <p className="text-xs text-content-muted text-center py-6">No workers available for this project.</p>
            )}
          </div>
          <div className="flex justify-between gap-2 pt-4 mt-2 border-t border-surface-border">
            <button type="button" onClick={() => setStep("details")} className="min-h-11 px-4 py-2 text-sm md:text-xs text-content-secondary hover:text-content-primary active:opacity-70 transition-colors">
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="min-h-11 px-4 py-2 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold-hover active:opacity-80 transition-colors"
            >
              Create Crew
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
