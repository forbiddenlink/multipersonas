import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoxDivider } from "@/components/forensic/divider";
import { createProjectAction } from "./actions";

export const metadata: Metadata = {
  title: "Projects",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const errorMessage = typeof error === "string" ? error : null;

  const supabase = await createClient();
  const projects = await listProjects(supabase);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-1 text-muted-foreground">
        Group your saved audits by site so a scan history and re-runs stay together.
      </p>

      <BoxDivider label="new project" className="my-5" />

      <form action={createProjectAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Name
            </Label>
            <Input id="name" name="name" placeholder="Acme Marketing Site" required maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              URL
            </Label>
            <Input id="url" name="url" type="url" placeholder="https://example.com" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Description <span className="normal-case text-muted-foreground/70">(optional)</span>
          </Label>
          <Input id="description" name="description" placeholder="What is this site for?" maxLength={500} />
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <Button type="submit" size="sm">
          Create project
        </Button>
      </form>

      <BoxDivider label="all projects" className="my-5" />

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project above to start grouping audits by site.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
          <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">┌─ </span>
            projects
            <span className="ml-2 tabular-nums text-muted-foreground">{projects.length}</span>
          </div>
          <ul className="divide-y divide-border">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-card-foreground">
                      <span className="select-none text-[var(--primary)]">›&nbsp;</span>
                      {project.name}
                    </p>
                    <p className="truncate pl-3.5 text-xs text-muted-foreground">
                      {hostname(project.url)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
