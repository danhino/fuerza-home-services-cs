import type { JobStatus } from "@prisma/client";

const ORDER: JobStatus[] = [
  "Draft",
  "Requested",
  "Matched",
  "EnRoute",
  "Arrived",
  "Diagnosing",
  "Working",
  "AwaitingEstimateApproval",
  "Completed",
  "Cancelled"
];

const NEXT: Partial<Record<JobStatus, JobStatus[]>> = {
  Draft: ["Requested", "Cancelled"],
  Requested: ["Matched", "Cancelled"],
  Matched: ["EnRoute", "Cancelled"],
  EnRoute: ["Arrived", "Cancelled"],
  Arrived: ["Diagnosing", "Working", "AwaitingEstimateApproval", "Cancelled"],
  Diagnosing: ["Working", "AwaitingEstimateApproval", "Cancelled"],
  Working: ["AwaitingEstimateApproval", "Completed", "Cancelled"],
  AwaitingEstimateApproval: ["Diagnosing", "Working", "Cancelled"],
  Completed: [],
  Cancelled: []
};

export function assertJobTransition(from: JobStatus, to: JobStatus) {
  const allowed = NEXT[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid job status transition: ${from} -> ${to}`);
  }
}

export function isTerminalStatus(s: JobStatus) {
  return s === "Completed" || s === "Cancelled";
}

export function statusSortKey(s: JobStatus) {
  return ORDER.indexOf(s);
}


