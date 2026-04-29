#!/usr/bin/env node

/**
 * Dry-run simulator for job move flow and FC tab visibility.
 *
 * This does not hit the database and does not call APIs.
 * It mirrors the move logic in app/api/job-cards/[id]/move/route.ts
 * and FC tab filters in:
 * - app/api/fc/completed-jobs/route.ts
 * - app/protected/fc/page.js (escalations via escalation_role=fc)
 */

const ROLE_ALIAS_MAP = {
  admin: "admin",
  inv: "inv",
  inventory: "inv",
  accounts: "accounts",
  account: "accounts",
  fc: "fc",
  finance: "fc",
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const appendMoveNote = (existingNotes, targetRole, note) => {
  const trimmedNote = String(note || "").trim();
  if (!trimmedNote) return String(existingNotes || "").trim() || null;

  const existing = String(existingNotes || "").trim();
  const prefix = `[Move note to ${String(targetRole || "").toUpperCase()}]`;
  return existing
    ? `${existing}\n\n${prefix}\n${trimmedNote}`
    : `${prefix}\n${trimmedNote}`;
};

const applyMoveRouteLogic = (inputJob, requestBody) => {
  const destination = String(requestBody?.destination || "").trim().toLowerCase();
  const targetRole = ROLE_ALIAS_MAP[destination];
  if (!targetRole) {
    throw new Error(`Invalid destination role: ${requestBody?.destination}`);
  }

  const sourceRole = normalize(inputJob.role || inputJob.move_to || "") || null;
  const preserveCompleted = Boolean(requestBody?.preserveCompleted);
  const shouldPreserveCompletedForFc = targetRole === "fc" && preserveCompleted;
  const shouldMoveAsCompleted =
    targetRole === "accounts" || shouldPreserveCompletedForFc;

  const escalationPayload = shouldMoveAsCompleted
    ? {
        escalation_role: null,
        escalation_source_role: null,
        escalated_at: null,
      }
    : {
        escalation_role: targetRole,
        escalation_source_role: sourceRole,
        escalated_at: "<now>",
      };

  const nextCompletionNotes = appendMoveNote(
    inputJob.completion_notes,
    targetRole,
    requestBody?.note,
  );

  if (["fc", "inv", "accounts"].includes(targetRole)) {
    const completionPayload = shouldMoveAsCompleted
      ? {
          role: targetRole,
          move_to: targetRole,
          status: "completed",
          job_status: "Completed",
          completion_date: "<now>",
          end_time: "<now>",
          ...escalationPayload,
          ...(targetRole === "fc" ? { fc_note_acknowledged: false } : {}),
          ...(nextCompletionNotes ? { completion_notes: nextCompletionNotes } : {}),
        }
      : {
          role: targetRole,
          move_to: targetRole,
          status: "pending",
          job_status: "pending",
          completion_date: null,
          end_time: null,
          ...escalationPayload,
          ...(targetRole === "fc" ? { fc_note_acknowledged: false } : {}),
          ...(nextCompletionNotes ? { completion_notes: nextCompletionNotes } : {}),
        };

    return { ...inputJob, ...completionPayload };
  }

  return {
    ...inputJob,
    status: `moved_to_${targetRole}`,
    role: targetRole,
    move_to: targetRole,
    ...escalationPayload,
  };
};

const applyLegacyAdminSendToFc = (inputJob) => ({
  ...inputJob,
  role: "fc",
});

const classifyFcTabs = (job) => {
  const role = normalize(job.role);
  const jobStatus = normalize(job.job_status);
  const escalationRole = normalize(job.escalation_role);

  const inEscalations = escalationRole === "fc";
  const inJobCardReview =
    role === "fc" &&
    (jobStatus === "completed") &&
    escalationRole !== "fc";

  if (inEscalations && inJobCardReview) return "Both (unexpected)";
  if (inEscalations) return "FC Escalations";
  if (inJobCardReview) return "FC Job Card Review";
  return "Neither FC tab";
};

const baseJob = {
  id: "dry-run-job-001",
  role: "inv",
  move_to: "inv",
  status: "completed",
  job_status: "Completed",
  completion_notes: "Existing completion notes.",
  escalation_role: null,
  escalation_source_role: null,
  escalated_at: null,
};

const scenarios = [
  {
    scenario: "Move API: INV -> FC (default)",
    request: { destination: "fc" },
    run: (job) => applyMoveRouteLogic(job, { destination: "fc" }),
  },
  {
    scenario: "Move API: INV -> FC (preserveCompleted=true)",
    request: { destination: "fc", preserveCompleted: true },
    run: (job) =>
      applyMoveRouteLogic(job, {
        destination: "fc",
        preserveCompleted: true,
      }),
  },
  {
    scenario: "Move API: INV -> FC (preserveCompleted + note)",
    request: {
      destination: "fc",
      preserveCompleted: true,
      note: "Please verify billing items.",
    },
    run: (job) =>
      applyMoveRouteLogic(job, {
        destination: "fc",
        preserveCompleted: true,
        note: "Please verify billing items.",
      }),
  },
  {
    scenario: "Move API: INV -> FC (note only)",
    request: {
      destination: "fc",
      note: "Please review and return.",
    },
    run: (job) =>
      applyMoveRouteLogic(job, {
        destination: "fc",
        note: "Please review and return.",
      }),
  },
  {
    scenario: "Move API: INV -> Accounts",
    request: { destination: "accounts" },
    run: (job) => applyMoveRouteLogic(job, { destination: "accounts" }),
  },
  {
    scenario: "Move API: INV -> Admin",
    request: { destination: "admin" },
    run: (job) => applyMoveRouteLogic(job, { destination: "admin" }),
  },
  {
    scenario: "Legacy Admin Send to FC (PATCH role only)",
    request: { role: "fc" },
    run: (job) => applyLegacyAdminSendToFc(job),
  },
];

const rows = scenarios.map((item) => {
  const result = item.run({ ...baseJob });
  return {
    Scenario: item.scenario,
    Destination: item.request.destination || "n/a",
    preserveCompleted: String(Boolean(item.request.preserveCompleted)),
    role: result.role || "",
    move_to: result.move_to || "",
    status: result.status || "",
    job_status: result.job_status || "",
    escalation_role: result.escalation_role || "",
    fc_tab: classifyFcTabs(result),
  };
});

console.log("\nFC Move Flow Dry-Run\n");
console.table(rows);

console.log("Notes:");
console.log("- FC Escalations tab key: escalation_role = 'fc'");
console.log("- FC Job Card Review key: role='fc' + job_status='Completed/completed' + escalation_role!='fc'");
console.log("- This is a logic simulation only (no DB writes).\n");
