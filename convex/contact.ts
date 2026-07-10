import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 upper bound
const MAX_ORGANIZATION_LENGTH = 200;
const MAX_SUBJECT_LENGTH = 100;
const MAX_BODY_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Rate limiting: the endpoint is public by nature (contact form), these
// bounds cap spam and quota abuse without hurting legitimate visitors.
// The global cap is deliberately high: it only bounds worst-case storage
// under attack (~150 × ~6 KB/h) without letting a handful of forged
// requests lock legitimate visitors out. If it ever triggers in practice,
// the planned escalation is a server-verified CAPTCHA (e.g. Turnstile).
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const PER_EMAIL_LIMIT = 3; // messages per email per window
const GLOBAL_LIMIT = 150; // messages total per window

export const send = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    organization: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    website: v.optional(v.string()), // honeypot — bots fill it, humans never see it
  },
  handler: async (ctx, args) => {
    // Honeypot triggered: pretend success, store nothing.
    if (args.website) {
      return { ok: true };
    }

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const organization = args.organization?.trim() || undefined;
    const subject = args.subject.trim();
    const body = args.body.trim();

    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new ConvexError({ code: "INVALID", message: "Nom invalide" });
    }
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      throw new ConvexError({
        code: "INVALID",
        message: "Adresse email invalide",
      });
    }
    if (organization && organization.length > MAX_ORGANIZATION_LENGTH) {
      throw new ConvexError({
        code: "INVALID",
        message: "Organisation trop longue",
      });
    }
    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      throw new ConvexError({ code: "INVALID", message: "Sujet invalide" });
    }
    if (!body || body.length > MAX_BODY_LENGTH) {
      throw new ConvexError({
        code: "INVALID",
        message: "Message vide ou trop long",
      });
    }

    // Global cap first: under a saturation attack every rejected attempt
    // costs a single tiny counter read, nothing proportional to the data.
    const fenetre = new Date(Date.now()).toISOString().slice(0, 13);
    const compteur = await ctx.db
      .query("compteur_fenetres")
      .withIndex("by_fenetre", (q) => q.eq("fenetre", fenetre))
      .unique();
    if (compteur && compteur.total >= GLOBAL_LIMIT) {
      throw new ConvexError({
        code: "SATURATED",
        message: "Le formulaire est temporairement saturé.",
      });
    }

    const since = Date.now() - RATE_WINDOW_MS;
    const recentFromEmail = await ctx.db
      .query("messages")
      .withIndex("by_email_receivedAt", (q) =>
        q.eq("email", email).gt("receivedAt", since),
      )
      .take(PER_EMAIL_LIMIT);
    if (recentFromEmail.length >= PER_EMAIL_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "Trop de messages envoyés récemment avec cette adresse.",
      });
    }

    if (compteur) {
      await ctx.db.patch(compteur._id, { total: compteur.total + 1 });
    } else {
      await ctx.db.insert("compteur_fenetres", { fenetre, total: 1 });
    }

    await ctx.db.insert("messages", {
      name,
      email,
      organization,
      subject,
      body,
      receivedAt: Date.now(),
      status: "new",
    });

    // TODO(next phase): schedule an action that forwards the message to
    // Fabien's professional inbox via an email provider (e.g. Resend).

    return { ok: true };
  },
});
