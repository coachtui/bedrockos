import type { CxStaffingStatus } from "@/lib/cx/types";
import { STAFFING_LABEL, STAFFING_COLOR } from "@/lib/cx/staffing";

const STAFFING_LABEL_XS: Record<CxStaffingStatus, string> = {
  understaffed: "Low",
  staffed:      "OK",
  overstaffed:  "High",
};

interface StaffingBadgeProps {
  status: CxStaffingStatus;
  size?: "sm" | "xs";
}

export function StaffingBadge({ status, size = "sm" }: StaffingBadgeProps) {
  const base =
    size === "xs"
      ? "text-[9px] px-1 py-0"
      : "text-xs px-2 py-0.5";

  const label = size === "xs" ? STAFFING_LABEL_XS[status] : STAFFING_LABEL[status];

  return (
    <span
      className={`inline-flex items-center rounded border font-semibold ${base} ${STAFFING_COLOR[status]}`}
      title={STAFFING_LABEL[status]}
    >
      {label}
    </span>
  );
}
