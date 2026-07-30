import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { listAudits } from "@/lib/audits";
import { compareProjectRuns } from "@/lib/baseline";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { RunDiff } from "@/components/run-diff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoxDivider } from "@/components/forensic/divider";
import { updateProjectAction, deleteProjectAction } from "../actions";
import { DeleteProjectForm } from "../delete-project-form";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const errorMessage = typeof error === "string" ? error : null;

  const supabase = await createClient();
  const project = await getProject(supabase, id);
  if (!project) notFound();

  const audits = await listAudits(supabase, { projectId: project.id });
  const regression = await compareProjectRuns(supabase, audits);

  const updateWithId = updateProjectAction.bind(null, project.id);
  const deleteWithId = deleteProjectAction.bind(null, project.id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground">
              projects
            </Link>
            <span className="mx-1.5 select-none">/</span>
            {project.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 truncate font-mono text-sm text-muted-foreground">
            {project.url}
          </p>
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <DeleteProjectForm action={deleteWithId} projectName={project.name} />
      </div>

      <BoxDivider label="new scan for this project" className="my-5" />

      <AuditForm projectId={project.id} defaultUrl={project.url} />

      {regression ? (
        <>
          <BoxDivider label="since last run" className="my-5" />
          <RunDiff diff={regression} />
        </>
      ) : null}

      <BoxDivider label="saved runs" className="my-5" />

      <AuditHistory audits={audits} />

      <BoxDivider label="edit project" className="my-5" />

      <form action={updateWithId} className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="name"
            className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={project.name}
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="description"
            className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Description <span className="normal-case text-muted-foreground/70">(optional)</span>
          </Label>
          <Input
            id="description"
            name="description"
            defaultValue={project.description ?? ""}
            maxLength={500}
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <Button type="submit" variant="outline" size="sm">
          Save changes
        </Button>
      </form>
    </div>
  );
}
