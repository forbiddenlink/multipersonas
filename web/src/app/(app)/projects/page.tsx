import { redirect } from "next/navigation";

// Placeholder for the Phase B multi-site "Projects" workspace (see
// docs/plans/2026-07-27-personaudit-product-design.md). Until that ships, /projects
// redirects to the dashboard so the reserved URL never 404s. Not linked in AppNav yet.
export default function ProjectsPage() {
  redirect("/dashboard");
}
