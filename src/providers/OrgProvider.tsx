"use client";

import React, { createContext, useContext, useState } from "react";
import type { OrgConfig, ProjectContext, ModuleId, UserRole } from "@/types/org";
import type { ModuleFeatureMap } from "@/types/org";
import type {
  Issue, ActivityEvent, Project, Asset, OrgWorker, OrgCrew,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
} from "@/types/domain";
import { getOrgConfig, MOCK_USER_BY_ROLE, DEFAULT_USER } from "@/lib/config/org";
import { getModulesForBundles } from "@/lib/modules/bundles";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { MOCK_ASSETS }   from "@/lib/mock/assets";
import { MOCK_WORKERS }  from "@/lib/mock/workers";
import { MOCK_CREWS }    from "@/lib/mock/crews";

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
  emittedIssues:       Issue[];
  emittedActivity:     ActivityEvent[];
  addEmittedIssue:     (issue: Issue) => void;
  addEmittedActivity:  (event: ActivityEvent) => void;
  // Entity state
  projects:   Project[];
  assets:     Asset[];
  workers:    OrgWorker[];
  crews:      OrgCrew[];
  // Entity mutators
  addProject: (input: CreateProjectInput) => Project;
  addAsset:   (input: CreateAssetInput)   => Asset;
  addCrew:    (input: CreateCrewInput)    => OrgCrew;
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

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(getOrgConfig);

  // Emitter state
  const [emittedIssues,   setEmittedIssues]   = useState<Issue[]>([]);
  const [emittedActivity, setEmittedActivity] = useState<ActivityEvent[]>([]);

  // Entity state — seeded from mock files
  const orgId = config.org.id;
  // Phase 1: MOCK_PROJECTS and MOCK_ASSETS have no orgId field — single-org, no filter needed.
  // Phase 3: replace with org-scoped Supabase fetches.
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [assets,   setAssets]   = useState<Asset[]>(MOCK_ASSETS);
  const [workers]               = useState<OrgWorker[]>(MOCK_WORKERS.filter((w) => w.orgId === orgId));
  const [crews,    setCrews]    = useState<OrgCrew[]>(seedCrews(orgId));

  function addEmittedActivity(event: ActivityEvent): void {
    setEmittedActivity((prev) => [event, ...prev]);
  }

  function addEmittedIssue(issue: Issue): void {
    setEmittedIssues((prev) => [issue, ...prev]);
  }

  function setCurrentProject(project: ProjectContext) {
    if (!projects.some((p) => p.id === project.id)) return;
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
        emittedIssues,
        emittedActivity,
        addEmittedIssue,
        addEmittedActivity,
        projects,
        assets,
        workers,
        crews,
        addProject,
        addAsset,
        addCrew,
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
