import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_LIMIT = 150;

export const inscrire = mutation({
  args: {
    email: v.string(),
    website: v.optional(v.string()), // honeypot
  },
  handler: async (ctx, args) => {
    if (args.website) {
      return { ok: true, deja: false };
    }

    const email = args.email.trim().toLowerCase();
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      throw new ConvexError({
        code: "INVALID",
        message: "Adresse email invalide",
      });
    }

    // Global hourly cap, isolated bucket (prefix) from the contact form.
    const fenetre = `interets:${new Date(Date.now()).toISOString().slice(0, 13)}`;
    const compteur = await ctx.db
      .query("compteur_fenetres")
      .withIndex("by_fenetre", (q) => q.eq("fenetre", fenetre))
      .unique();
    if (compteur && compteur.total >= GLOBAL_LIMIT) {
      throw new ConvexError({
        code: "SATURATED",
        message: "Trop d'inscriptions en ce moment.",
      });
    }

    // Idempotent: an address already on the list is a success, not an error.
    const existant = await ctx.db
      .query("interets")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existant) {
      return { ok: true, deja: true };
    }

    if (compteur) {
      await ctx.db.patch(compteur._id, { total: compteur.total + 1 });
    } else {
      await ctx.db.insert("compteur_fenetres", { fenetre, total: 1 });
    }

    await ctx.db.insert("interets", {
      email,
      source: "espace-apprenant",
      receivedAt: Date.now(),
      status: "new",
    });

    return { ok: true, deja: false };
  },
});
