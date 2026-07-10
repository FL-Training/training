import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query";
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import type { TextesFormulaire } from "../../lib/contenu";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;
const queryClient = new QueryClient();

interface ContactPayload {
  name: string;
  email: string;
  organization: string;
  subject: string;
  body: string;
  website: string; // honeypot — must stay empty
}

interface Props {
  textes: TextesFormulaire;
}

const inputClass =
  "w-full rounded-lg border border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)] bg-white/70 px-4 py-3 text-[0.95rem] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-sage-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]/30 transition-colors";

const labelClass =
  "mb-1.5 block text-sm font-semibold text-[var(--color-navy-deep)]";

function Fallback({ textes }: Props) {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-ink)_12%,transparent)] bg-white/50 p-8">
      <h3 className="text-lg font-semibold text-[var(--color-navy-deep)]">
        {textes.repli_titre}
      </h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--color-ink-soft)]">
        {textes.repli_texte}
      </p>
      <a
        href={textes.linkedin}
        rel="noopener noreferrer"
        target="_blank"
        className="btn btn-primary mt-6"
      >
        {textes.repli_bouton}
      </a>
    </div>
  );
}

function errorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError) {
    const data = error.data as { code?: string } | undefined;
    return data?.code;
  }
  return undefined;
}

function Form({ textes }: Props) {
  const [sent, setSent] = useState(false);
  // Until the island hydrates, the server-rendered form has no submit
  // handler: a native submission would GET the current page and leak the
  // fields into the URL. Keeping the only submit button disabled until
  // hydration blocks submission (including implicit Enter submission).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const mutation = useMutation({
    mutationFn: async (payload: ContactPayload) => {
      if (!convex) throw new Error("Convex non configuré");
      return convex.mutation("contact:send" as never, payload as never);
    },
    onSuccess: () => setSent(true),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      organization: String(data.get("organization") ?? "").trim(),
      subject: String(data.get("subject") ?? textes.sujets[0]?.valeur ?? ""),
      body: String(data.get("body") ?? "").trim(),
      website: String(data.get("website") ?? ""),
    });
  }

  if (sent) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[var(--color-sage)] bg-[var(--color-sage-faint)] p-8"
      >
        <h3 className="text-lg font-semibold text-[var(--color-sage-deep)]">
          {textes.succes_titre}
        </h3>
        <p className="mt-2 text-[0.95rem] text-[var(--color-ink-soft)]">
          {textes.succes_texte}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} method="post" className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            {textes.champ_nom} *
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
            placeholder={textes.champ_nom_exemple}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            {textes.champ_email} *
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder={textes.champ_email_exemple}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-organization" className={labelClass}>
            {textes.champ_organisation}
          </label>
          <input
            id="contact-organization"
            name="organization"
            type="text"
            maxLength={200}
            autoComplete="organization"
            placeholder={textes.champ_organisation_exemple}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className={labelClass}>
            {textes.champ_sujet} *
          </label>
          <select
            id="contact-subject"
            name="subject"
            required
            className={inputClass}
            defaultValue={textes.sujets[0]?.valeur}
          >
            {textes.sujets.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-body" className={labelClass}>
          {textes.champ_message} *
        </label>
        <textarea
          id="contact-body"
          name="body"
          required
          maxLength={5000}
          rows={6}
          placeholder={textes.champ_message_exemple}
          className={inputClass}
        />
      </div>

      {/* Honeypot: hidden from humans, tempting for bots */}
      <div
        className="absolute -left-2499 h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Ne pas remplir</label>
        <input
          id="contact-website"
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
          {
            {
              RATE_LIMITED: textes.erreur_trop_de_messages,
              SATURATED: textes.erreur_saturation,
              INVALID: textes.erreur_invalide,
            }[errorCode(mutation.error) ?? ""] ?? textes.erreur_generique
          }{" "}
          <a
            className="font-semibold underline"
            href={textes.linkedin}
            rel="noopener noreferrer"
            target="_blank"
          >
            LinkedIn
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={!hydrated || mutation.isPending}
        className="btn btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {mutation.isPending
          ? textes.bouton_envoi_en_cours
          : textes.bouton_envoyer}
      </button>
      <p className="text-xs leading-relaxed text-[var(--color-ink-faint)]">
        {textes.mention_donnees}
      </p>
    </form>
  );
}

export default function ContactForm({ textes }: Props) {
  if (!convex) return <Fallback textes={textes} />;
  return (
    <QueryClientProvider client={queryClient}>
      <Form textes={textes} />
    </QueryClientProvider>
  );
}
