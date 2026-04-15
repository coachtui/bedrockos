"use client";

import React, { createContext, useContext, useState } from "react";
import type { OrgConfig, ProjectContext, ModuleId, UserRole } from "@/types/org";
import type { ModuleFeatureMap } from "@/types/org";
import type { Issue, ActivityEvent } from "@/types/domain";
import { getOrgConfig, MOCK_PROJECT_CONTEXTS, MOCK_USER_BY_ROLE, DEFAULT_USER } from "@/lib/config/org";
import { getModulesForBundles } from "@/lib/modules/bundles";

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
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(getOrgConfig);
  const [emittedIssues,   setEmittedIssues]   = useState<Issue[]>([]);
  const [emittedActivity, setEmittedActivity] = useState<ActivityEvent[]>([]);

  function addEmittedIssue(issue: Issue): void {
    setEmittedIssues((prev) => [issue, ...prev]);
  }

  function addEmittedActivity(event: ActivityEvent): void {
    setEmittedActivity((prev) => [event, ...prev]);
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

  const enabledModules = getModulesForBundles(config.purchasedBundles);

  function isModuleEnabled(id: ModuleId): boolean {
    return enabledModules.includes(id);
  }

  function getModuleFeatures(id: ModuleId): ModuleFeatureMap {
    return config.features[id] ?? {};
  }

  return (
    <OrgContext.Provider
      value={{
        currentOrganization: config.org,
        currentProject:      config.currentProject,
        currentUser:         config.currentUser,
        role:                config.currentUser.role,
        enabledModules:      enabledModules,
        features:            config.features,
        availableProjects:   MOCK_PROJECT_CONTEXTS,
        setCurrentProject,
        setRole,
        isModuleEnabled,
        getModuleFeatures,
        emittedIssues,
        emittedActivity,
        addEmittedIssue,
        addEmittedActivity,
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
