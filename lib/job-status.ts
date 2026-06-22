const COMPLETED_STATUS_TOKENS = new Set(["completed", "done", "invoiced"]);
const NON_TECH_QUEUE_ROLES = new Set([
  "inv",
  "inventory",
  "fc",
  "admin",
  "accounts",
]);

/** True when either job_status or status is a completed-like value (case-insensitive). */
export function isJobMarkedCompleted(job: {
  job_status?: string | null;
  status?: string | null;
}) {
  const jobStatus = String(job.job_status ?? "")
    .trim()
    .toLowerCase();
  const status = String(job.status ?? "")
    .trim()
    .toLowerCase();
  return (
    COMPLETED_STATUS_TOKENS.has(jobStatus) ||
    COMPLETED_STATUS_TOKENS.has(status)
  );
}

/** Job has been moved or escalated out of the technician queue. */
export function isJobMovedAwayFromTech(job: {
  role?: string | null;
  move_to?: string | null;
  escalation_role?: string | null;
}) {
  const escalationRole = String(job.escalation_role ?? "")
    .trim()
    .toLowerCase();
  if (escalationRole === "tech") return false;

  const role = String(job.role ?? "").trim().toLowerCase();
  const moveTo = String(job.move_to ?? "").trim().toLowerCase();

  if (escalationRole && NON_TECH_QUEUE_ROLES.has(escalationRole)) return true;
  if (moveTo && NON_TECH_QUEUE_ROLES.has(moveTo)) return true;

  return false;
}

/** Jobs visible on technician My Jobs / All Jobs active queues. */
export function isJobActiveInTechQueue(job: {
  job_status?: string | null;
  status?: string | null;
  role?: string | null;
  move_to?: string | null;
  escalation_role?: string | null;
}) {
  return !isJobMarkedCompleted(job) && !isJobMovedAwayFromTech(job);
}

const STARTED_STATUS_TOKENS = new Set([
  "active",
  "in_progress",
  "started",
  "assigned",
]);

const parsePhotoList = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/** Job has been started by a technician (show Continue + Complete on jobs list). */
export function isJobStartedInTech(job: {
  job_status?: string | null;
  status?: string | null;
  start_time?: string | null;
  before_photos?: unknown;
}) {
  if (isJobMarkedCompleted(job)) return false;

  const jobStatus = String(job.job_status ?? "")
    .trim()
    .toLowerCase();
  const status = String(job.status ?? "")
    .trim()
    .toLowerCase();

  if (STARTED_STATUS_TOKENS.has(jobStatus) || STARTED_STATUS_TOKENS.has(status)) {
    return true;
  }

  if (String(job.start_time ?? "").trim()) return true;
  if (parsePhotoList(job.before_photos).length > 0) return true;

  return false;
}
