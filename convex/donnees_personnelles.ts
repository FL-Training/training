/**
 * GDPR operations on contact messages: access, erasure, retention.
 *
 * These rights exist whether or not the privacy page mentions them
 * (GDPR art. 15–22), and a request must be answered within one month
 * (art. 12.3). Until now the site could receive messages but offered no
 * way to read, export or delete them — the page promised what the code
 * could not do. These functions close that gap.
 *
 * ⚠️ EVERY FUNCTION HERE IS INTERNAL, AND THAT IS THE POINT.
 *
 * A public `query` in Convex is callable by anyone who knows the
 * deployment URL. A public "give me every message from this address"
 * would hand the whole mailbox to whoever guesses an email — the exact
 * breach these functions are meant to prevent. `internalQuery` and
 * `internalMutation` are reachable only from the Convex dashboard and
 * from other server functions, never from a browser.
 *
 * They are therefore operated by the site administrator, at Fabien
 * Lacombe's request, from the Convex dashboard.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * How long contact messages are kept: three years after they arrive.
 *
 * Decided on 09/08/2026, in line with the CNIL guidance for commercial
 * contacts. It has to be a number, not "as long as necessary": a
 * duration that cannot be counted cannot be enforced, and the privacy
 * page now states this one.
 */
export const RETENTION_JOURS = 3 * 365;

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Every message from one address — right of access and portability.
 *
 * Uses the `by_email_receivedAt` index, so answering a request costs one
 * indexed lookup rather than a full scan.
 */
export const parEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_email_receivedAt", (q) => q.eq("email", email.trim().toLowerCase()))
      .collect();

    return messages.map((m) => ({
      recu_le: new Date(m.receivedAt).toISOString(),
      nom: m.name,
      email: m.email,
      organisation: m.organization ?? null,
      sujet: m.subject,
      message: m.body,
      statut: m.status,
    }));
  },
});

/**
 * Erasure of every message from one address — right to be forgotten.
 *
 * Returns the number of deleted messages so the request can be answered
 * with a figure, and so the operation leaves a trace in the dashboard
 * logs. Deletion is final: Convex keeps no recycle bin.
 */
export const supprimerParEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_email_receivedAt", (q) => q.eq("email", email.trim().toLowerCase()))
      .collect();

    for (const m of messages) await ctx.db.delete(m._id);
    return { supprimes: messages.length, email };
  },
});

/**
 * Retention purge, run daily by the scheduler (see crons.ts).
 *
 * Batched on purpose. A Convex mutation is a single transaction with a
 * bounded number of writes; deleting an unbounded backlog in one call
 * would fail and leave nothing purged. A capped batch always completes,
 * and the next run picks up where this one stopped — the backlog drains
 * over a few days instead of never draining at all.
 */
export const purge = internalMutation({
  args: { lot: v.optional(v.number()) },
  handler: async (ctx, { lot }) => {
    const taille = Math.min(lot ?? 200, 500);
    const limite = Date.now() - RETENTION_JOURS * JOUR_MS;

    const perimes = await ctx.db
      .query("messages")
      .withIndex("by_receivedAt", (q) => q.lt("receivedAt", limite))
      .take(taille);

    for (const m of perimes) await ctx.db.delete(m._id);

    return {
      supprimes: perimes.length,
      // True when the batch was full: more may remain for the next run.
      reste_possible: perimes.length === taille,
      limite: new Date(limite).toISOString(),
    };
  },
});

/**
 * What is stored today, without reading anyone's message.
 *
 * Useful to answer "how much do we hold, and since when" — for the
 * record of processing activities (art. 30) and to check that the purge
 * does its work.
 */
export const etat = internalQuery({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    const dates = messages.map((m) => m.receivedAt).sort((a, b) => a - b);
    return {
      messages: messages.length,
      plus_ancien: dates.length ? new Date(dates[0]).toISOString() : null,
      plus_recent: dates.length ? new Date(dates[dates.length - 1]).toISOString() : null,
      retention_jours: RETENTION_JOURS,
      /*
        The waiting list is declared in the schema but no form feeds it
        yet: `WaitlistForm` is not rendered anywhere on the site. It is
        counted here so the day it opens does not go unnoticed — its
        purpose differs (being notified of a launch), so it will need its
        own legal basis, its own retention and its own mention on the
        privacy page.
      */
      liste_attente: (await ctx.db.query("interets").collect()).length,
    };
  },
});
