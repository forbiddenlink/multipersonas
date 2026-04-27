import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditForm } from "@/components/audit-form";

const features = [
  {
    title: "Persona Diversity",
    description:
      "10+ built-in personas from screen reader users to impatient executives",
    badge: "Built-in",
  },
  {
    title: "Real Browser Testing",
    description:
      "AI agents actually browse your site, clicking, typing, and navigating",
    badge: "Automated",
  },
  {
    title: "Accessibility First",
    description:
      "axe-core + WCAG compliance + condition simulation built in",
    badge: "WCAG",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-6">
          AI-Powered QA
        </Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Test your website through the eyes of real users
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          AI personas with diverse backgrounds, accessibility needs, and tech
          proficiency levels browse your site and report what breaks.
        </p>
      </section>

      {/* Free Audit */}
      <section className="px-6 pb-24">
        <AuditForm />
      </section>

      <Separator />

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 py-24">
        <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <Badge variant="outline" className="mb-2 w-fit">
                  {feature.badge}
                </Badge>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Social Proof Placeholder */}
      <section className="py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Trusted by X teams
        </p>
      </section>
    </div>
  );
}
