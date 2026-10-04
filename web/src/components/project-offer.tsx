import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { hostname } from "@/lib/format";
import type { ProjectOffer as Offer } from "@/lib/project-prefill";

/**
 * What the Projects page says about a graded site: one primary action to create the project,
 * or the plain reason it cannot (already saved, or the plan's project cap). The caller passes
 * the create action so this stays a plain Server Component.
 */
export function ProjectOffer({
  offer,
  planName,
  action,
}: {
  offer: Offer;
  planName: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  if (offer.kind === "none") return null;

  if (offer.kind === "exists") {
    return (
      <section aria-labelledby="project-offer-heading" className="sheet p-5">
        <h2 id="project-offer-heading" className="display text-xl leading-snug">
          You already track this site
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <Link href={`/projects/${offer.project.id}`} className="text-link">
            {offer.project.name}
          </Link>{" "}
          keeps your free grades of {hostname(offer.project.url)}. Open it to re-grade after a fix.
        </p>
      </section>
    );
  }

  if (offer.kind === "limit") {
    return (
      <section aria-labelledby="project-offer-heading" className="sheet p-5">
        <h2 id="project-offer-heading" className="display text-xl leading-snug">
          Your {planName} plan is at its project limit
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          It includes {offer.limit} project{offer.limit === 1 ? "" : "s"}, and you have{" "}
          <Link href={`/projects/${offer.project.id}`} className="text-link">
            {offer.project.name}
          </Link>
          . See{" "}
          <Link href="/pricing" className="text-link">
            pricing
          </Link>{" "}
          to add more projects.
        </p>
      </section>
    );
  }

  const host = hostname(offer.prefill.url);
  return (
    <section aria-labelledby="project-offer-heading" className="sheet p-5">
      <h2 id="project-offer-heading" className="display text-xl leading-snug">
        Save {host} as a project
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        A project keeps your free grades of one site together, so you can re-grade after a fix.
      </p>
      <form action={action} className="mt-4">
        <input type="hidden" name="name" value={offer.prefill.name} />
        <input type="hidden" name="url" value={offer.prefill.url} />
        <SubmitButton>Create a project for {host}</SubmitButton>
      </form>
    </section>
  );
}
