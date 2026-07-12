import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import { ConvexHttpClient } from "convex/browser";
import type { TextesWaitlist } from "../../lib/contenu";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;
const queryClient = new QueryClient();

interface Props {
  textes: TextesWaitlist;
}

function Form({ textes }: Props) {
  const [etat, setEtat] = useState<"idle" | "ok" | "deja">("idle");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const mutation = useMutation({
    mutationFn: async (payload: { email: string; website: string }) => {
      if (!convex) throw new Error("Convex non configuré");
      return convex.mutation("interets:inscrire" as never, payload as never) as Promise<{
        ok: boolean;
        deja: boolean;
      }>;
    },
    onSuccess: (resultat) => setEtat(resultat.deja ? "deja" : "ok"),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      email: String(data.get("email") ?? "").trim(),
      website: String(data.get("website") ?? ""),
    });
  }

  if (etat !== "idle") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="rounded-lg border border-[var(--color-sage)] bg-[var(--color-sage-faint)] px-4 py-3 text-sm font-medium text-[var(--color-sage-deep)]"
      >
        {etat === "deja" ? textes.deja_inscrit : textes.succes}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          {textes.champ_email}
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder={textes.champ_email_exemple}
          className="w-full flex-1 rounded-full border border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)] bg-white/70 px-5 py-3 text-[0.95rem] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-sage-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]/30"
        />
        <button
          type="submit"
          disabled={!hydrated || mutation.isPending}
          className="btn btn-primary shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? textes.bouton_en_cours : textes.bouton}
        </button>
      </div>

      <div
        className="absolute -left-2499 h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="waitlist-website">Ne pas remplir</label>
        <input
          id="waitlist-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {mutation.isError && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {textes.erreur}
        </p>
      )}

      <p className="text-xs leading-relaxed text-[var(--color-ink-faint)]">
        {textes.mention}
      </p>
    </form>
  );
}

export default function WaitlistForm({ textes }: Props) {
  if (!convex) {
    return (
      <p className="text-sm text-[var(--color-ink-faint)]">{textes.erreur}</p>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <Form textes={textes} />
    </QueryClientProvider>
  );
}
