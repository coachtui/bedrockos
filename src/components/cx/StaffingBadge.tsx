import type { CxStaffingStatus } from "@/lib/cx/types";
import { STAFFING_LABEL, STAFFING_COLOR } from "@/lib/cx/staffing";

interface StaffingBadgeProps {
  status: CxStaffingStatus;
  size?: "sm" | "xs";
}

export function StaffingBadge({ status, size = "sm" }: StaffingBadgeProps) {
  const base =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5"
      : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded border font-semibold ${base} ${STAFFING_COLOR[status]}`}
    >
      {STAFFING_LABEL[status]}
    </span>
  );
}
