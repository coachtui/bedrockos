"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { CreateWorkerInput, WorkerRole } from "@/types/domain";
import type { UserRole } from "@/types/org";

interface Props {
  onClose:   () => void;
  onCreated: (workerId: string) => void;
}

type Step = "details" | "skills";

const EXIT_MS = 250;

const WORKER_ROLES: { value: WorkerRole; label: string }[] = [
  { value: "carpenter",      label: "Carpenter" },
  { value: "driver",         label: "Driver" },
  { value: "foreman",        label: "Foreman" },
  { value: "laborer",        label: "Laborer" },
  { value: "mason",          label: "Mason" },
  { value: "mechanic",       label: "Mechanic" },
  { value: "operator",       label: "Operator" },
  { value: "superintendent", label: "Superintendent" },
];

const CAN_ADD_SKILLS = new Set<UserRole>(["owner", "admin", "equipment_director", "operations_manager", "superintendent"]);

export function AddWorkerModal({ onClose, onCreated }: Props) {
  const { addWorker, addSkillToRole, skillCatalog, role: userRole } = useOrg();

  const [open, setOpen]                     = useState(true);
  const [step, setStep]                     = useState<Step>("details");
  const [name, setName]                     = useState("");
  const [workerRole, setWorkerRole]         = useState<WorkerRole>("laborer");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [customSkill, setCustomSkill]       = useState("");
  const [error, setError]                   = useState("");

  function close() {
    setOpen(false);
    window.setTimeout(onClose, EXIT_MS);
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill); else next.add(skill);
      return next;
    });
  }

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Worker name is required."); return; }
    setError("");
    setStep("skills");
  }

  function handleAddCustomSkill() {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    addSkillToRole(workerRole, trimmed);
    setSelectedSkills((prev) => new Set(prev).add(trimmed));
    setCustomSkill("");
  }

  function handleSubmit() {
    const input: CreateWorkerInput = {
      name:   name.trim(),
      role:   workerRole,
      skills: Array.from(selectedSkills),
    };
    const worker = addWorker(input);
    setOpen(false);
    window.setTimeout(() => {
      onCreated(worker.id);
      onClose();
    }, EXIT_MS);
  }

  const roleSkills   = skillCatalog[workerRole] ?? [];
  const canAddSkills = CAN_ADD_SKILLS.has(userRole);

  const header = (
    <div>
      <h2 className="text-base md:text-sm font-semibold text-content-primary">Add Worker</h2>
      <p className="text-xs text-content-muted mt-0.5">
        Step {step === "details" ? "1" : "2"} of 2 —{" "}
        {step === "details" ? "Worker details" : "Assign skills"}
      </p>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={close} title={header} ariaLabel="Add Worker">
      {step === "details" && (
        <form onSubmit={handleDetailsNext} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Role</label>
            <select
              value={workerRole}
              onChange={(e) => {
                setWorkerRole(e.target.value as WorkerRole);
                setSelectedSkills(new Set());
              }}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {WORKER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              className="min-h-11 px-4 py-2 text-sm md:text-xs text-content-secondary hover:text-content-primary active:opacity-70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-11 px-4 py-2 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold-hover active:opacity-80 transition-colors"
            >
              Next: Assign Skills
            </button>
          </div>
        </form>
      )}

      {step === "skills" && (
        <div className="px-5 py-4">
          <p className="text-xs text-content-muted mb-3">
            {selectedSkills.size} skill{selectedSkills.size !== 1 ? "s" : ""} selected
          </p>

          <div className="space-y-1 max-h-[35vh] md:max-h-52 overflow-y-auto">
            {roleSkills.map((skill) => {
              const selected = selectedSkills.has(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded text-left transition-colors active:opacity-80 ${
                    selected
                      ? "bg-gold/10 border border-gold/30"
                      : "bg-surface-overlay border border-transparent hover:border-surface-border"
                  }`}
                >
                  <p className="text-sm text-content-primary">{skill}</p>
                  {selected && <Check size={14} className="text-gold shrink-0" />}
                </button>
              );
            })}
            {roleSkills.length === 0 && (
              <p className="text-xs text-content-muted text-center py-4">No skills defined for this role.</p>
            )}
          </div>

          {canAddSkills && (
            <div className="mt-3 pt-3 border-t border-surface-border">
              <p className="text-xs text-content-muted mb-2">Add a skill to this role</p>
              <div className="flex gap-2">
                <input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomSkill(); } }}
                  placeholder="Skill name..."
                  className="flex-1 text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="min-h-11 flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-surface-overlay border border-surface-border rounded hover:border-gold text-content-secondary hover:text-content-primary active:opacity-80 transition-colors"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-4 mt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="min-h-11 px-4 py-2 text-sm md:text-xs text-content-secondary hover:text-content-primary active:opacity-70 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="min-h-11 px-4 py-2 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold-hover active:opacity-80 transition-colors"
            >
              Add Worker
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
