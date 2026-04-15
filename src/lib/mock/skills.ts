import type { WorkerRole } from "@/types/domain";

export const SKILL_CATALOG: Record<WorkerRole, string[]> = {
  operator:       ["Excavator", "Crane", "Dozer", "Pump Truck", "Vac Truck", "Telehandler", "Forklift", "GPS Equipment"],
  driver:         ["Pump Truck", "Vac Truck", "Flatbed", "Water Truck", "GPS Equipment"],
  mechanic:       ["Hydraulic Systems", "Diesel Engine", "Electrical Diagnostics", "Welding", "GPS Equipment"],
  mason:          ["Brick", "Block", "Stone", "Waterline Install", "Demo"],
  carpenter:      ["Formwork", "Finish Carpentry", "Framing", "Demo"],
  laborer:        ["Waterline Install", "Demo", "Concrete Finishing", "Rebar", "Excavation Support"],
  foreman:        ["GPS Equipment", "Safety Officer", "OSHA 30"],
  superintendent: ["GPS Equipment", "Safety Officer", "OSHA 30"],
};
