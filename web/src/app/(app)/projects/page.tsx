import type { Metadata } from "next";
import { ExhibitHead } from "@/components/dossier/exhibit-head";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoxDivider } from "@/components/forensic/divider";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { createProjectAction } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { projectOffer, projectPrefill } from "@/lib/project-prefill";
import { ProjectOffer } from "@/components/project-offer";
import { formatShortDate, hostname } from "@/lib/format";
import { getExactPlan, planAllowsPersonas, planDisplayName, PROJECT_LIMITS, projectLimitFor } from "@/lib/entitlements";
import { projectsEmptyHint, projectsIntro } from "@/lib/project-copy";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error, url } = await searchParams;
  const prefill = projectPrefill(typeof url === "string" ? url : null);
  // Whitelist known server-action messages — prevents arbitrary text injection
  // via crafted URLs even though React escapes XSS.
  const KNOWN_PROJECT_ERRORS = new Set([
    "Give the project a name.",
    "Enter a valid http(s) URL.",
    "Could not create the project.",
    "Could not check your project allowance. Please try again.",
    ...Object.values(PROJECT_LIMITS)
      .filter((limit) => limit !== null)
      .map((limit) => `Your plan includes ${limit} project${limit === 1 ? "" : "s"}. See pricing to add more.`),
  ]);
  const errorMessage =
    typeof error === "string" && KNOWN_PROJECT_ERRORS.has(error) ? error : null;

  const supabase = await createClient();
  const projects = await listProjects(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const plan = await getExactPlan(supabase, user?.id ?? null);
  const limit = projectLimitFor(plan);
  const canRunPersonas = planAllowsPersonas(plan);
  const offer = projectOffer(prefill, projects, limit);
  // A create would be refused at the cap, so the form is hidden rather than offered and then failed.
  const atLimit = limit !== null && projects.length >= limit;

  return (
    <div className="max-w-2xl">
      <ExhibitHead label="Client files" className="mb-5" />
      <h1 className="display text-2xl leading-tight text-foreground">Projects</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {projectsIntro(canRunPersonas)}
      </p>

      {offer.kind !== "none" ? (
        <div className="mt-5">
          <ProjectOffer offer={offer} planName={planDisplayName(plan)} action={createProjectAction} />
        </div>
      ) : null}

      {atLimit ? (
        offer.kind === "none" ? (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Your {planDisplayName(plan)} plan includes {limit} project{limit === 1 ? "" : "s"}. See{" "}
            <Link href="/pricing" className="text-link">
              pricing
            </Link>{" "}
            to add more.
          </p>
        ) : null
      ) : (
        <>
      <BoxDivider label={offer.kind === "create" ? "or change the details first" : "new project"} className="my-5" />

      <form action={createProjectAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="label-mono">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Marketing Site"
              defaultValue={prefill?.name}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url" className="label-mono">
              URL
            </Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://example.com"
              defaultValue={prefill?.url}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="label-mono">
            Description <span className="normal-case tracking-normal">(optional)</span>
          </Label>
          <Input id="description" name="description" placeholder="What is this site for?" maxLength={500} />
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <SubmitButton size="sm" variant={offer.kind === "create" ? "outline" : "default"}>
          Create project
        </SubmitButton>
      </form>
        </>
      )}

      <BoxDivider label="all projects" className="my-5" />

      {projects.length === 0 ? (
        <EmptyPrompt
          prompt="No projects yet."
          hint={projectsEmptyHint(canRunPersonas)}
        />
      ) : (
        <div
      tabIndex={0}
      role="region"
      aria-label="All projects table"
      className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
          <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
            <caption className="sr-only">Your projects by name, host, and creation date</caption>
            <thead>
              <tr className="border-b-2 border-foreground">
                <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                  Project
                </th>
                <th scope="col" className="hidden py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground sm:table-cell">
                  Host
                </th>
                <th scope="col" className="py-2 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-border">
                  <th scope="row" className="py-3 pr-4 font-normal">
                    <Link href={`/projects/${project.id}`} className="text-link truncate">
                      {project.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                      {hostname(project.url)}
                    </p>
                  </th>
                  <td className="hidden truncate py-3 pr-4 font-mono text-xs text-muted-foreground sm:table-cell">
                    {hostname(project.url)}
                  </td>
                  <td className="py-3 text-right text-xs text-muted-foreground">
                    {formatShortDate(project.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
