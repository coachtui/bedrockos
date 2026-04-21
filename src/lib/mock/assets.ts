import type { Asset } from "@/types/domain";

export const MOCK_ASSETS: Asset[] = [
  {
    id:         "asset_001",
    name:       "Cat 330 Excavator #EQ-014",
    type:       "Excavator",
    status:     "maintenance",
    project_id: "proj_highland_002",
    last_seen:  "2026-04-08T06:00:00Z",
  },
  {
    id:         "asset_002",
    name:       "Tower Crane #CR-1",
    type:       "Crane",
    status:     "active",
    project_id: "proj_highland_002",
    last_seen:  "2026-04-08T14:00:00Z",
  },
  {
    id:         "asset_003",
    name:       "Concrete Pump #CP-3",
    type:       "Pump",
    status:     "active",
    project_id: "proj_highland_002",
    last_seen:  "2026-04-08T13:30:00Z",
  },
  {
    id:         "asset_004",
    name:       "Crawler Crane #CR-7",
    type:       "Crane",
    status:     "offline",
    project_id: "proj_oakridge_001",
    last_seen:  "2026-04-11T07:00:00Z",
  },
  {
    id:         "asset_005",
    name:       "Cat D6 Dozer #DZ-02",
    type:       "Dozer",
    status:     "active",
    project_id: "proj_oakridge_001",
    last_seen:  "2026-04-07T15:45:00Z",
  },
  {
    id:         "asset_006",
    name:       "Scissor Lift #SL-9",
    type:       "Lift",
    status:     "offline",
    project_id: "proj_meridian_003",
    last_seen:  "2026-03-28T09:00:00Z",
  },
];
