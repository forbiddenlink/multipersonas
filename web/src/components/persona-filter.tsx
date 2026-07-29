"use client";

import { useSearchParams, useRouter } from "next/navigation";

const categoryLabels: Record<string, string> = {
  all: "All",
  reachability: "Reachability",
  mobile: "Mobile",
  enterprise: "Enterprise",
  technical: "Technical",
  "low-tech": "Low-tech",
  "budget-sensitive": "Budget-sensitive",
};

export function PersonaFilter({
  categories,
}: {
  categories: string[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("category") ?? "all";

  function handleClick(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "/personas", { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {["all", ...categories].map((cat) => {
        const isActive = active === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => handleClick(cat)}
            aria-pressed={isActive}
            className={`rounded-sm border px-2.5 py-1 font-mono text-xs uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            }`}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        );
      })}
    </div>
  );
}
