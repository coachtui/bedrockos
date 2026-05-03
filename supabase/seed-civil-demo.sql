-- Civil demo seed data — CX tasks and day assignments for buyer demo
-- Before running:
--   1. Create a civil project via the UI (Projects → New Project)
--   2. Get its id:  select id, name from projects order by created_at desc limit 5;
--   3. Get your org id: select distinct org_id from projects limit 1;
--   4. Get worker ids: select id, name, role from workers where org_id = '<YOUR_ORG_ID>' limit 20;
--   5. Replace all <YOUR_ORG_ID>, <YOUR_PROJECT_ID>, and worker ID placeholders below, then run.

-- ── Tasks ──────────────────────────────────────────────────────────────────────

insert into cx_tasks (id, org_id, project_id, name, type, start_date, end_date, location, status, crew_requirements, assigned_worker_ids, notes) values

-- Active today through Friday (spans current week)
('cx_demo_001', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Subgrade Grading — Station 12+00 to 15+00', 'grading',
 '2026-05-03', '2026-05-07',
 'Station 12+00', 'in_progress',
 '[{"role":"operator","count":2},{"role":"laborer","count":3}]',
 '{}',
 'Motor grader and compactor on site. Target grade tolerance ±0.05 ft.'),

-- Starts tomorrow
('cx_demo_002', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Storm Drain Installation — Sta 13+50', 'utility',
 '2026-05-04', '2026-05-06',
 'Station 13+50', 'not_started',
 '[{"role":"operator","count":1},{"role":"laborer","count":4}]',
 '{}',
 'Install 48-inch CMP with headwall. Shoring required.'),

-- Pour mid-week
('cx_demo_003', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Concrete Curb & Gutter — Sta 12+00 to 14+00', 'pour',
 '2026-05-06', '2026-05-06',
 'Station 12+00 – 14+00', 'not_started',
 '[{"role":"mason","count":2},{"role":"laborer","count":3},{"role":"operator","count":1}]',
 '{}',
 '180 CY. Pump truck requested. Crew start 6:00 AM.'),

-- Inspection Friday
('cx_demo_004', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Compaction Testing — Subgrade Layer', 'inspection',
 '2026-05-07', '2026-05-07',
 'Stations 12+00 to 15+00', 'not_started',
 '[]',
 '{}',
 'County inspector on site 9 AM. Nuclear gauge required.'),

-- Delivery next week
('cx_demo_005', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Aggregate Base Course Delivery', 'delivery',
 '2026-05-11', '2026-05-11',
 'Gate 1 staging area', 'not_started',
 '[]',
 '{}',
 '400 tons Class 2 aggregate. 14 loads from Hanson Quarry.');


-- ── Day Assignments ────────────────────────────────────────────────────────────
-- Replace worker ID placeholders with real IDs from your workers table.

insert into cx_day_assignments (id, org_id, worker_id, project_id, date) values
-- Operator on site Mon–Thu
('cxda_demo_001', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-03'),
('cxda_demo_002', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-04'),
('cxda_demo_003', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-05'),
('cxda_demo_004', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-06'),
-- Mason on site for pour day
('cxda_demo_005', '<YOUR_ORG_ID>', '<MASON_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-06'),
-- Laborer Mon–Wed
('cxda_demo_006', '<YOUR_ORG_ID>', '<LABORER_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-03'),
('cxda_demo_007', '<YOUR_ORG_ID>', '<LABORER_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-04'),
('cxda_demo_008', '<YOUR_ORG_ID>', '<LABORER_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-05');
