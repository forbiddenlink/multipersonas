import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import Link from "next/link";
import { Suspense } from "react";
import {
  personaLibrary,
  personasByCategory,
} from "@engine/personas/library";
import { PersonaCard } from "@/components/persona-card";
import { PersonaFilter } from "@/components/persona-filter";
import { BoxDivider } from "@/components/forensic/divider";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";

export const metadata: Metadata = {
  title: "Personas",
};

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { category } = await searchParams;
  const activeCategory =
    typeof category === "string" ? category : undefined;

  const allPersonas = Object.values(personaLibrary);
  const categoryKeys = Object.keys(personasByCategory);

  const filteredPersonas =
    activeCategory && activeCategory in personasByCategory
      ? allPersonas.filter(
          (p) => personasByCategory[activeCategory]?.includes(p.id) ?? false,
        )
      : allPersonas;

  return (
    <div>
      <ExhibitHead label="Persona library" className="mb-5" />
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-2xl leading-tight text-foreground">Personas</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Navigators that browse toward a goal. Task success, not a compliance verdict.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Run an audit &rarr;
        </Link>
      </div>

      <BoxDivider label="persona library" className="my-5" />

      <Suspense fallback={<div className="flex gap-2 py-2">{Array.from({length: 4}).map((_, i) => <div key={i} className="h-6 w-20 animate-pulse rounded-sm bg-muted" />)}</div>}>
        <PersonaFilter categories={categoryKeys} />
      </Suspense>

      {filteredPersonas.length === 0 ? (
        <EmptyPrompt
          className="mt-8"
          prompt="No personas in this category."
          hint="Try another filter, or clear it to see the full library."
          action={
            <Link
              href="/personas"
              className="rounded-sm border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Show all
            </Link>
          }
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} />
          ))}
        </div>
      )}
    </div>
  );
}
