"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
      {["all", ...categories].map((cat) => (
        <Button
          key={cat}
          variant={active === cat ? "default" : "secondary"}
          size="sm"
          onClick={() => handleClick(cat)}
          className="rounded-full"
        >
          {categoryLabels[cat] ?? cat}
        </Button>
      ))}
    </div>
  );
}
