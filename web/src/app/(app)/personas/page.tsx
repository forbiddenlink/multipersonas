import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  personaLibrary,
  personasByCategory,
} from "@engine/personas/library";
import { PersonaCard } from "@/components/persona-card";
import { PersonaFilter } from "@/components/persona-filter";
import { Separator } from "@/components/ui/separator";

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
      ? allPersonas.filter((p) =>
          personasByCategory[activeCategory].includes(p.id),
        )
      : allPersonas;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personas</h1>
          <p className="mt-1 text-muted-foreground">
            Explore the AI personas that test your site
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Run an audit &rarr;
        </Link>
      </div>

      <Separator className="my-4" />

      <Suspense fallback={<div className="flex gap-2 py-2">{Array.from({length: 4}).map((_, i) => <div key={i} className="h-8 w-20 animate-pulse rounded-md bg-muted" />)}</div>}>
        <PersonaFilter categories={categoryKeys} />
      </Suspense>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPersonas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>

      {filteredPersonas.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          No personas found in this category.
        </p>
      )}
    </div>
  );
}
