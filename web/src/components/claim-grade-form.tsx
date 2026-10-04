"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimedMessage, gradeTokenFromInput } from "@/lib/grade-tokens";
import { trackProductEvent } from "@/lib/analytics";

/**
 * Save a grade by its link. Automatic claiming only works in the browser that ran the
 * grade, so a user who confirmed their email elsewhere pastes the result link here. The
 * token in the link is the authorization, exactly as in the automatic claim.
 */
export function ClaimGradeForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(null);
    setError(null);
    const token = gradeTokenFromInput(value);
    if (!token) {
      setError("That is not a grade link. Paste the address of a result page, like personaudit.com/grade/...");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/grade/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: [token] }),
      });
      const body: unknown = await res.json().catch(() => null);
      const claimed =
        body && typeof body === "object" && "claimed" in body && typeof body.claimed === "number"
          ? body.claimed
          : 0;
      if (!res.ok) {
        setError("Could not save that grade. Try again in a moment.");
      } else if (claimed > 0) {
        trackProductEvent("grades_claimed", { count: claimed });
        setSaved(claimedMessage(claimed));
        setValue("");
        router.refresh();
      } else {
        setError("Nothing was saved. That grade may already belong to an account, or the link may be wrong.");
      }
    } catch {
      setError("Could not save that grade. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <Label htmlFor="claim-grade-link" className="label-mono">
        Grade link
      </Label>
      <p id="claim-grade-hint" className="text-sm leading-relaxed text-muted-foreground">
        Have a grade link? Paste it to save it to your account. Grades only save themselves in the
        browser that ran them.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="claim-grade-link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://personaudit.com/grade/..."
          autoComplete="off"
          spellCheck={false}
          aria-describedby="claim-grade-hint"
          aria-invalid={error ? true : undefined}
          className="font-mono"
        />
        <Button type="submit" variant="outline" loading={pending}>
          Save grade
        </Button>
      </div>
      <div role="status" aria-live="polite">
        {saved ? <p className="text-sm">{saved}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--redline)]">
          <span aria-hidden="true">■ </span>
          {error}
        </p>
      ) : null}
    </form>
  );
}
