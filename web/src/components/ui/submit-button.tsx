"use client";

import { useFormStatus } from "react-dom";

import { Button } from "./button";

/**
 * A submit button that reflects the enclosing form's pending state (the 6th
 * interaction state — DESIGN.md §Interaction Completeness). Must render inside a
 * <form action={...}>. While the action runs it shows the Button spinner, sets
 * aria-busy, and disables itself so the action can't be double-submitted.
 */
export function SubmitButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}
