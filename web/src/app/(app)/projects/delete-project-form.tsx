"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

/** Wraps the delete Server Action with an inline two-step confirm — cascade-deletes every
 * saved run (and its findings) for the project via the FK, so this needs an explicit
 * warning before the POST fires. No native window.confirm — styled to match the forensic
 * UI instead. */
export function DeleteProjectForm({
  action,
  projectName,
}: {
  action: () => Promise<void>;
  projectName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form
        action={action}
        className="flex items-center gap-2 rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2"
      >
        <p className="font-mono text-xs text-destructive">
          Delete &ldquo;{projectName}&rdquo; permanently?
        </p>
        <SubmitButton variant="destructive" size="sm">
          Confirm
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={() => setConfirming(true)}
    >
      Delete project
    </Button>
  );
}
