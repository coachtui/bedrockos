"use client";

import React, { createContext, useContext, useReducer } from "react";
import type { CxTask, CxEvent, CxDayAssignment, CreateCxTaskInput } from "@/lib/cx/types";
import { MOCK_CX_EVENTS } from "@/lib/cx/mock-data";
import { serverCreateTask, serverBulkCreateTasks, serverUpdateTask } from "@/lib/actions/cx-tasks";
import { serverCreateAssignment, serverRemoveAssignment } from "@/lib/actions/cx-assignments";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

interface CxState {
  tasks:       CxTask[];
  events:      CxEvent[];
  assignments: CxDayAssignment[];
}

type CxAction =
  | { type: "ADD_TASK";          task:       CxTask }
  | { type: "ADD_TASKS";         tasks:      CxTask[] }
  | { type: "UPDATE_TASK";       id:         string; patch: Partial<CxTask> }
  | { type: "ADD_EVENT";         event:      CxEvent }
  | { type: "ADD_ASSIGNMENT";    assignment: CxDayAssignment }
  | { type: "REMOVE_ASSIGNMENT"; id:         string };

function cxReducer(state: CxState, action: CxAction): CxState {
  switch (action.type) {
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };

    case "ADD_TASKS":
      return { ...state, tasks: [...state.tasks, ...action.tasks] };

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      };

    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.event] };

    case "ADD_ASSIGNMENT":
      return { ...state, assignments: [...state.assignments, action.assignment] };

    case "REMOVE_ASSIGNMENT":
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.id) };

    default:
      return state;
  }
}

interface CxContextValue {
  tasks:            CxTask[];
  events:           CxEvent[];
  assignments:      CxDayAssignment[];
  addTask:          (input: CreateCxTaskInput) => CxTask;
  addTasks:         (inputs: CreateCxTaskInput[]) => CxTask[];
  updateTask:       (id: string, patch: Partial<CxTask>) => void;
  addEvent:         (input: Omit<CxEvent, "id">) => CxEvent;
  addAssignment:    (input: Omit<CxDayAssignment, "id">) => CxDayAssignment;
  removeAssignment: (id: string) => void;
}

const CxContext = createContext<CxContextValue | null>(null);

export function CxProvider({
  children,
  initialTasks       = [],
  initialAssignments = [],
}: {
  children:            React.ReactNode;
  initialTasks?:       CxTask[];
  initialAssignments?: CxDayAssignment[];
}) {
  const [state, dispatch] = useReducer(cxReducer, {
    tasks:       initialTasks,
    events:      MOCK_CX_EVENTS,
    assignments: initialAssignments,
  });

  function addTask(input: CreateCxTaskInput): CxTask {
    const task: CxTask = { ...input, id: crypto.randomUUID() };
    dispatch({ type: "ADD_TASK", task });
    void serverCreateTask(ORG_ID, task);
    return task;
  }

  function addTasks(inputs: CreateCxTaskInput[]): CxTask[] {
    const tasks: CxTask[] = inputs.map((input) => ({ ...input, id: crypto.randomUUID() }));
    dispatch({ type: "ADD_TASKS", tasks });
    void serverBulkCreateTasks(ORG_ID, tasks);
    return tasks;
  }

  function updateTask(id: string, patch: Partial<CxTask>) {
    dispatch({ type: "UPDATE_TASK", id, patch });
    void serverUpdateTask(id, patch);
  }

  function addEvent(input: Omit<CxEvent, "id">): CxEvent {
    const event: CxEvent = { ...input, id: `cx_evt_${Date.now()}` };
    dispatch({ type: "ADD_EVENT", event });
    return event;
  }

  function addAssignment(input: Omit<CxDayAssignment, "id">): CxDayAssignment {
    const existing = state.assignments.find(
      (a) => a.workerId === input.workerId && a.date === input.date,
    );
    if (existing) return existing;
    const assignment: CxDayAssignment = { ...input, id: crypto.randomUUID() };
    dispatch({ type: "ADD_ASSIGNMENT", assignment });
    void serverCreateAssignment(ORG_ID, assignment);
    return assignment;
  }

  function removeAssignment(id: string) {
    dispatch({ type: "REMOVE_ASSIGNMENT", id });
    void serverRemoveAssignment(id);
  }

  return (
    <CxContext.Provider value={{ ...state, addTask, addTasks, updateTask, addEvent, addAssignment, removeAssignment }}>
      {children}
    </CxContext.Provider>
  );
}

export function useCx(): CxContextValue {
  const ctx = useContext(CxContext);
  if (!ctx) throw new Error("useCx must be used inside CxProvider");
  return ctx;
}
