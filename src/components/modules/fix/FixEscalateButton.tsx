"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useShellEmitter } from "@/hooks/useShellEmitter";
import { useMx } from "@/providers/MxProvider";

interface FixEscalateButtonProps {
  assetId:   string;
  assetName: string;
  projectId: string;
}

/**
 * Shown to field roles (superintendent, foreman) when they cannot resolve
 * an equipment issue during field diagnosis.
 * Escalation: emits an Issue to the shell + creates an MX work order.
 */
export function FixEscalateButton({ assetId, assetName, projectId }: FixEscalateButtonProps) {
  const { emitIssue, emitActivity, currentUser } = useShellEmitter();
  const { createWorkOrder } = useMx();
  const [state, setState] = useState<"idle" | "done">("idle");

  function handleEscalate() {
    // 1. Create MX work order first so we can link the issue to it
    const wo = createWorkOrder({
      title:             `Field escalation — ${assetName}`,
      description:       `Escalated from Fix field diagnostic by ${currentUser.name}.`,
      category:          "corrective",
      priority:          "high",
      equipmentId:       assetId,
      equipmentLabel:    assetName,
      projectId,
      requestedBy:       currentUser.name,
      requestedByUserId: currentUser.id,
      requestedDate:     new Date().toISOString().slice(0, 10),
      readinessImpact:   "at_risk",
      opsBlocking:       false,
    });

    // 2. Emit issue, linked to the WO. Auto-resolves when the WO completes.
    const issueId = emitIssue({
      title:              `Field escalation — ${assetName} requires mechanic`,
      module:             "fix",
      severity:           "high",
      projectId,
      assetId,
      description:        `Field diagnostic could not resolve the issue. Escalated by ${currentUser.name}.`,
      relatedWorkOrderId: wo.id,
    });

    // 3. Emit activity
    emitActivity({
      actorName:  currentUser.name,
      action:     "escalated",
      entityType: "equipment",
      entityName: assetName,
      projectId,
      module:     "fix",
      targetType: "issue",
      targetId:   issueId,
    });

    setState("done");
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-teal/10 border border-teal/30 text-teal text-sm font-semibold">
        <CheckCircle size={16} />
        Mechanic dispatched — work order created
      </div>
    );
  }

  return (
    <button
      onClick={handleEscalate}
      className="flex items-center gap-2 px-4 py-3 rounded-lg bg-status-warning/10 border border-status-warning/30 text-status-warning text-sm font-semibold hover:bg-status-warning/20 transition-colors"
    >
      <AlertTriangle size={16} />
      Escalate — dispatch mechanic
    </button>
  );
}
