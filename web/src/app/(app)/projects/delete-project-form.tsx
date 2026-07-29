"use client";

import { Button } from "@/components/ui/button";

/** Wraps the delete Server Action with a native confirm — cascade-deletes every saved
 * run (and its findings) for the project via the FK, so this needs an explicit warning
 * before the POST fires. */
export function DeleteProjectForm({
  action,
  projectName,
}: {
  action: () => Promise<void>;
  projectName: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Delete "${projectName}"? This permanently deletes every saved audit run and finding for this project. This cannot be undone.`,
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <Button type="submit" variant="destructive" size="sm">
        Delete project
      </Button>
    </form>
  );
}
