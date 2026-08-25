import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Community-content queue hygiene. The real AI refinement pass lives in a
// Python worker (to be built); until it lands, this sweep keeps the
// submissions table honest:
//  - `pending` older than 24h -> needsReview (a human sees it, nothing rots)
//  - `processing` stuck >6h -> back to pending (a crashed worker cannot
//    deadlock the queue)
//
// FILENAME MATTERS: Convex registers cron jobs ONLY from the module whose
// canonical path is exactly "crons.js" (verified against convex-backend
// crates/convex/sync_types/src/module_path.rs CRON_PATH constant and the
// path.is_cron() gate in AnalyzeEnvironment.run_analyze). A cronJobs
// default export in any other file pushes cleanly but silently never
// schedules. This was previously cron.ts and the sweep never ran.
crons.interval(
  "sweepStaleSubmissions",
  { hours: 1 },
  internal.submissions.sweepStaleSubmissions,
  {},
);

export default crons;
