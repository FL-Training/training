import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    name: v.string(),
    email: v.string(),
    organization: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    receivedAt: v.number(),
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("answered"),
      v.literal("spam"),
    ),
  })
    .index("by_receivedAt", ["receivedAt"])
    .index("by_email_receivedAt", ["email", "receivedAt"]),

  // Lightweight hourly counters for the global rate limit: checking the
  // cap costs a single tiny document read instead of scanning messages.
  compteur_fenetres: defineTable({
    fenetre: v.string(), // hour bucket, e.g. "2026-07-09T20"
    total: v.number(),
  }).index("by_fenetre", ["fenetre"]),

  // Waitlist of the espace apprenant (e-learning launch)
  interets: defineTable({
    email: v.string(),
    source: v.string(),
    receivedAt: v.number(),
    status: v.union(v.literal("new"), v.literal("notifie")),
  }).index("by_email", ["email"]),
});
