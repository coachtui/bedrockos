"use client";

import React, { createContext, useContext, useState } from "react";
import type { OrgConfig, ProjectContext, ModuleId, UserRole } from "@/types/org";
import type { ModuleFeatureMap } from "@/types/org";
import type {
  Issue, ActivityEvent, Alert, Project, Asset, OrgWorker, OrgCrew,
  AssetStatus, CrewStatus,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
  CreateWorkerInput, WorkerRole,
  UpdateProjectInput,
} from "@/types/domain";
import { getOrgConfig, MOCK_USER_BY_ROLE, DEFAULT_USER } from "@/lib/config/org";
import { getModulesForBundles } from "@/lib/modules/bundles";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { MOCK_ASSETS }   from "@/lib/mock/assets";
import { MOCK_WORKERS }  from "@/lib/mock/workers";
import { MOCK_CREWS }    from "@/lib/mock/crews";
import { SKILL_CATALOG } from "@/lib/mock/skills";
import { MOCK_ISSUES }   from "@/lib/mock/issues";
import { MOCK_ALERTS }   from "@/lib/mock/alerts";
import { MOCK_ACTIVITY } from "@/lib/mock/activity";

interface OrgContextValue {
  currentOrganization: OrgConfig["org"];
  currentProject:      ProjectContext;
  currentUser:         OrgConfig["currentUser"];
  role:                UserRole;
  enabledModules:      ModuleId[];
  features:            OrgConfig["features"];
  availableProjects:   ProjectContext[];
  setCurrentProject:   (project: ProjectContext) => void;
  setRole:             (role: UserRole) => void;
  isModuleEnabled:     (id: ModuleId) => boolean;
  getModuleFeatures:   (id: ModuleId) => ModuleFeatureMap;
  issues:   Issue[];
  alerts:   Alert[];
  activity: ActivityEvent[];
  addEmittedIssue:    (issue: Issue) => void;
  addEmittedAlert:    (alert: Alert) => void;
  addEmittedActivity: (event: ActivityEvent) => void;
  // Entity state
  projects:   Project[];
  assets:     Asset[];
  workers:    OrgWorker[];
  crews:      OrgCrew[];
  // Entity mutators
  addProject:    (input: CreateProjectInput) => Project;
  updateProject: (id: string, patch: UpdateProjectInput) => void;
  addAsset:   (input: CreateAssetInput)   => Asset;
  addCrew:    (input: CreateCrewInput)    => OrgCrew;
  skillCatalog:   Record<WorkerRole, string[]>;
  addWorker:      (input: CreateWorkerInput) => OrgWorker;
  addSkillToRole: (role: WorkerRole, skill: string) => void;
  updateWorkerSkills: (workerId: string, skills: string[]) => void;
  reassignWorker:     (workerId: string, projectId: string | undefined, crewId: string | undefined) => void;
  toggleWorkerAvailability: (workerId: string) => void;
  updateAssetStatus:  (assetId: string, status: AssetStatus) => void;
  updateAssetProject: (assetId: string, projectId: string) => void;
  updateCrewStatus:     (crewId: string, status: CrewStatus) => void;
  updateCrewName:       (crewId: string, name: string) => void;
  addWorkerToCrew:      (crewId: string, workerId: string) => void;
  removeWorkerFromCrew: (crewId: string, workerId: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

function seedCrews(orgId: string): OrgCrew[] {
  return MOCK_CREWS.map((c) => ({
    id:        c.id,
    orgId,
    projectId: c.project_id,
    name:      c.name,
    memberIds: [],
    leadName:  c.lead_name,
    status:    c.status,
  }));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function OrgProvider({
  children,
  initialWorkers = [],
}: {
  children:        React.ReactNode;
  initialWorkers?: OrgWorker[];
}) {
  const [config, setConfig] = useState<OrgConfig>(getOrgConfig);

  // Issues / alerts / activity — seeded from mock; module events prepend via addEmitted*
  const [issues,   setIssues]   = useState<Issue[]>(MOCK_ISSUES);
  const [alerts,   setAlerts]   = useState<Alert[]>(MOCK_ALERTS);
  const [activity, setActivity] = useState<ActivityEvent[]>(MOCK_ACTIVITY);

  // Entity state — seeded from mock files
  const orgId = config.org.id;
  // Phase 1: MOCK_PROJECTS and MOCK_ASSETS have no orgId field — single-org, no filter needed.
  // Phase 3: replace with org-scoped Supabase fetches.
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [assets,   setAssets]   = useState<Asset[]>(MOCK_ASSETS);
  const [workers, setWorkers] = useState<OrgWorker[]>(() =>
    initialWorkers.length > 0
      ? initialWorkers
      : MOCK_WORKERS.filter((w) => w.orgId === orgId),
  );
  const [crews,    setCrews]    = useState<OrgCrew[]>(seedCrews(orgId));
  const [skillCatalog, setSkillCatalog] = useState<Record<WorkerRole, string[]>>(
    () => ({
      operator:       [...SKILL_CATALOG.operator],
      driver:         [...SKILL_CATALOG.driver],
      mechanic:       [...SKILL_CATALOG.mechanic],
      mason:          [...SKILL_CATALOG.mason],
      carpenter:      [...SKILL_CATALOG.carpenter],
      laborer:        [...SKILL_CATALOG.laborer],
      foreman:        [...SKILL_CATALOG.foreman],
      superintendent: [...SKILL_CATALOG.superintendent],
    })
  );

  function addEmittedActivity(event: ActivityEvent): void {
    setActivity((prev) => [event, ...prev]);
  }

  function addEmittedIssue(issue: Issue): void {
    setIssues((prev) => [issue, ...prev]);
  }

  function addEmittedAlert(alert: Alert): void {
    setAlerts((prev) => [alert, ...prev]);
  }

  function setCurrentProject(project: ProjectContext) {
    setConfig((prev) => ({ ...prev, currentProject: project }));
  }

  function setRole(role: UserRole) {
    setConfig((prev) => ({
      ...prev,
      currentUser: MOCK_USER_BY_ROLE[role] ?? { ...DEFAULT_USER, role },
    }));
  }

  function addProject(input: CreateProjectInput): Project {
    const project: Project = {
      id:            crypto.randomUUID(),
      name:          input.name,
      slug:          slugify(input.name),
      status:        "planning",
      phase:         input.phase,
      location:      input.location,
      pm_name:       input.pmName,
      progress_pct:  0,
      open_issues:   0,
      last_activity: new Date().toISOString(),
      start_date:    input.startDate,
      end_date:      input.endDate,
      description:   input.description,
      award_price:   input.awardPrice,
    };
    setProjects((prev) => [project, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "created project",
      entity_type: "project",
      entity_name: project.name,
      project_id:  project.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return project;
  }

  function updateProject(id: string, patch: UpdateProjectInput): void {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated: Project = { ...p, ...patch };
        if (patch.name) updated.slug = slugify(patch.name);
        return updated;
      }),
    );
  }

  function addAsset(input: CreateAssetInput): Asset {
    const asset: Asset = {
      id:         crypto.randomUUID(),
      name:       input.name,
      type:       input.type,
      status:     input.status,
      project_id: input.projectId,
      last_seen:  new Date().toISOString(),
    };
    setAssets((prev) => [asset, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "added asset",
      entity_type: "equipment",
      entity_name: asset.name,
      project_id:  input.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return asset;
  }

  function addCrew(input: CreateCrewInput): OrgCrew {
    const leadWorker = workers.find((w) => w.id === input.memberIds[0]);
    const crew: OrgCrew = {
      id:        crypto.randomUUID(),
      orgId,
      projectId: input.projectId,
      name:      input.name,
      memberIds: input.memberIds,
      leadName:  leadWorker?.name,
      status:    "on_site",
    };
    setCrews((prev) => [crew, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `created crew with ${input.memberIds.length} worker${input.memberIds.length !== 1 ? "s" : ""}`,
      entity_type: "crew",
      entity_name: crew.name,
      project_id:  input.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return crew;
  }

  function addWorker(input: CreateWorkerInput): OrgWorker {
    const worker: OrgWorker = {
      id:        crypto.randomUUID(),
      orgId,
      name:      input.name,
      role:      input.role,
      userId:    null,
      available: true,
      skills:    input.skills,
    };
    setWorkers((prev) => [worker, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "added worker to the roster",
      entity_type: "worker",
      entity_name: worker.name,
      project_id:  config.currentProject.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return worker;
  }

  function updateAssetStatus(assetId: string, status: AssetStatus): void {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, status } : a));
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `updated ${asset.name} status to ${status}`,
      entity_type: "equipment",
      entity_id:   assetId,
      entity_name: asset.name,
      project_id:  asset.project_id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function updateAssetProject(assetId: string, projectId: string): void {
    const asset   = assets.find((a) => a.id === assetId);
    const project = projects.find((p) => p.id === projectId);
    if (!asset) return;
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, project_id: projectId } : a));
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `moved ${asset.name} to ${project?.name ?? projectId}`,
      entity_type: "equipment",
      entity_id:   assetId,
      entity_name: asset.name,
      project_id:  projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function updateCrewStatus(crewId: string, status: CrewStatus): void {
    const crew = crews.find((c) => c.id === crewId);
    if (!crew) return;
    setCrews((prev) => prev.map((c) => c.id === crewId ? { ...c, status } : c));
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `updated ${crew.name} status to ${status === "on_site" ? "on site" : "off site"}`,
      entity_type: "crew",
      entity_id:   crewId,
      entity_name: crew.name,
      project_id:  crew.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function updateCrewName(crewId: string, name: string): void {
    const crew = crews.find((c) => c.id === crewId);
    if (!crew) return;
    setCrews((prev) => prev.map((c) => c.id === crewId ? { ...c, name } : c));
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `renamed ${crew.name} to ${name}`,
      entity_type: "crew",
      entity_id:   crewId,
      entity_name: name,
      project_id:  crew.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function addWorkerToCrew(crewId: string, workerId: string): void {
    const crew   = crews.find((c) => c.id === crewId);
    const worker = workers.find((w) => w.id === workerId);
    if (!crew || !worker) return;
    if (crew.memberIds.includes(workerId)) return;
    setCrews((prev) =>
      prev.map((c) => c.id === crewId ? { ...c, memberIds: [...c.memberIds, workerId] } : c),
    );
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `added ${worker.name} to ${crew.name}`,
      entity_type: "crew",
      entity_id:   crewId,
      entity_name: crew.name,
      project_id:  crew.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function removeWorkerFromCrew(crewId: string, workerId: string): void {
    const crew   = crews.find((c) => c.id === crewId);
    const worker = workers.find((w) => w.id === workerId);
    if (!crew || !worker) return;
    setCrews((prev) =>
      prev.map((c) =>
        c.id === crewId ? { ...c, memberIds: c.memberIds.filter((id) => id !== workerId) } : c,
      ),
    );
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `removed ${worker.name} from ${crew.name}`,
      entity_type: "crew",
      entity_id:   crewId,
      entity_name: crew.name,
      project_id:  crew.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function addSkillToRole(role: WorkerRole, skill: string): void {
    setSkillCatalog((prev) => ({
      ...prev,
      [role]: [...(prev[role] ?? []), skill],
    }));
  }

  function updateWorkerSkills(workerId: string, skills: string[]): void {
    setWorkers((prev) =>
      prev.map((w) => (w.id === workerId ? { ...w, skills } : w))
    );
  }

  function toggleWorkerAvailability(workerId: string): void {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;

    const next = !worker.available;
    setWorkers((prev) =>
      prev.map((w) => (w.id === workerId ? { ...w, available: next } : w))
    );

    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `marked ${worker.name} as ${next ? "available" : "needed on site"}`,
      entity_type: "worker",
      entity_id:   workerId,
      entity_name: worker.name,
      project_id:  worker.projectId ?? config.currentProject.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  function reassignWorker(
    workerId: string,
    projectId: string | undefined,
    crewId: string | undefined,
  ): void {
    const worker  = workers.find((w) => w.id === workerId);
    if (!worker) return;

    // 1. Update worker.projectId, clear siteName
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === workerId ? { ...w, projectId, siteName: undefined } : w,
      ),
    );

    // 2. Remove worker from all crew memberIds
    setCrews((prev) =>
      prev.map((c) => ({
        ...c,
        memberIds: c.memberIds.filter((id) => id !== workerId),
      })),
    );

    // 3. Add to new crew if provided
    if (crewId) {
      setCrews((prev) =>
        prev.map((c) =>
          c.id === crewId ? { ...c, memberIds: [...c.memberIds, workerId] } : c,
        ),
      );
    }

    // 4. Emit activity — read names from current state snapshot
    const crew    = crewId    ? crews.find((c) => c.id === crewId)       : undefined;
    const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

    let action: string;
    if (crewId && crew) {
      action = `reassigned ${worker.name} to ${crew.name}`;
    } else if (projectId && project) {
      action = `moved ${worker.name} to ${project.name}`;
    } else {
      action = `removed ${worker.name} from project assignment`;
    }

    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action,
      entity_type: "worker",
      entity_id:   workerId,
      entity_name: worker.name,
      project_id:  projectId ?? config.currentProject.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }

  const enabledModules = getModulesForBundles(config.purchasedBundles);

  function isModuleEnabled(id: ModuleId): boolean {
    return enabledModules.includes(id);
  }

  function getModuleFeatures(id: ModuleId): ModuleFeatureMap {
    return config.features[id] ?? {};
  }

  const availableProjects: ProjectContext[] = projects.map((p) => ({
    id:   p.id,
    name: p.name,
    slug: p.slug,
  }));

  return (
    <OrgContext.Provider
      value={{
        currentOrganization: config.org,
        currentProject:      config.currentProject,
        currentUser:         config.currentUser,
        role:                config.currentUser.role,
        enabledModules,
        features:            config.features,
        availableProjects,
        setCurrentProject,
        setRole,
        isModuleEnabled,
        getModuleFeatures,
        issues,
        alerts,
        activity,
        addEmittedIssue,
        addEmittedAlert,
        addEmittedActivity,
        projects,
        assets,
        workers,
        crews,
        addProject,
        updateProject,
        addAsset,
        addCrew,
        skillCatalog,
        addWorker,
        addSkillToRole,
        updateWorkerSkills,
        reassignWorker,
        toggleWorkerAvailability,
        updateAssetStatus,
        updateAssetProject,
        updateCrewStatus,
        updateCrewName,
        addWorkerToCrew,
        removeWorkerFromCrew,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
