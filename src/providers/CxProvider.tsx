"use client";

import React, { createContext, useContext, useReducer } from "react";
import type { CxTask, CxEvent, CxDayAssignment, CreateCxTaskInput } from "@/lib/cx/types";
import { MOCK_CX_TASKS, MOCK_CX_EVENTS, MOCK_CX_ASSIGNMENTS } from "@/lib/cx/mock-data";

interface CxState {
  tasks:       CxTask[];
  events:      CxEvent[];
  assignments: CxDayAssignment[];
}

type CxAction =
  | { type: "ADD_TASK";          task:       CxTask }
  | { type: "UPDATE_TASK";       id:         string; patch: Partial<CxTask> }
  | { type: "ADD_EVENT";         event:      CxEvent }
  | { type: "ADD_ASSIGNMENT";    assignment: CxDayAssignment }
  | { type: "REMOVE_ASSIGNMENT"; id:         string };

function cxReducer(state: CxState, action: CxAction): CxState {
  switch (action.type) {
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };

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
  updateTask:       (id: string, patch: Partial<CxTask>) => void;
  addEvent:         (input: Omit<CxEvent, "id">) => CxEvent;
  addAssignment:    (input: Omit<CxDayAssignment, "id">) => CxDayAssignment;
  removeAssignment: (id: string) => void;
}

const CxContext = createContext<CxContextValue | null>(null);

export function CxProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cxReducer, {
    tasks:       MOCK_CX_TASKS,
    events:      MOCK_CX_EVENTS,
    assignments: MOCK_CX_ASSIGNMENTS,
  });

  function addTask(input: CreateCxTaskInput): CxTask {
    const task: CxTask = {
      ...input,
      id: `cx_task_${Date.now()}`,
    };
    dispatch({ type: "ADD_TASK", task });
    return task;
  }

  function updateTask(id: string, patch: Partial<CxTask>) {
    dispatch({ type: "UPDATE_TASK", id, patch });
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
    const assignment: CxDayAssignment = { ...input, id: `cx_asgn_${Date.now()}` };
    dispatch({ type: "ADD_ASSIGNMENT", assignment });
    return assignment;
  }

  function removeAssignment(id: string) {
    dispatch({ type: "REMOVE_ASSIGNMENT", id });
  }

  return (
    <CxContext.Provider value={{ ...state, addTask, updateTask, addEvent, addAssignment, removeAssignment }}>
      {children}
    </CxContext.Provider>
  );
}

export function useCx(): CxContextValue {
  const ctx = useContext(CxContext);
  if (!ctx) throw new Error("useCx must be used inside CxProvider");
  return ctx;
}
