/**
 * Scheduled jobs.
 *
 * One job today: enforcing the retention of contact messages. Without
 * it, the privacy page would still be claiming a limited retention that
 * nothing applies — the gap this file is here to close.
 */
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/*
  Daily, at a quiet hour (UTC).

  Daily rather than hourly: the cutoff is three years, so a message
  lingering a few hours past it changes nothing legally, while an hourly
  job would wake the deployment 24 times a day for nothing.

  The purge deletes in capped batches (see donnees_personnelles.ts). If a
  backlog ever exceeds one batch, the next runs drain it — which is why
  this job must keep running even once the table looks empty.
*/
crons.daily(
  "purge expired contact messages",
  { hourUTC: 3, minuteUTC: 30 },
  internal.donnees_personnelles.purge,
  {},
);

export default crons;
