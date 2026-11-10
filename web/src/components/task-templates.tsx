"use client";

/**
 * One-click starting points for the project task form. Every run without a saved task
 * fell back to generic built-in goals (2026-10-20: all three projects had none), so the
 * cheapest fix is to make a real task a two-click job.
 *
 * A template fills the goal only. The expected text has to come from the user's own
 * site, so the template focuses that field and shows an example of what to type
 * instead of guessing it.
 */

export interface TaskTemplate {
  id: string;
  label: string;
  goal: string;
  /** Example of the kind of text that marks success; shown as the placeholder, never filled in. */
  textHint: string;
}

export const TASK_TEMPLATES: readonly TaskTemplate[] = [
  {
    id: "pricing",
    label: "Find pricing",
    goal: "Starting from the home page, find out what this costs and reach the page that lists the prices.",
    textHint: "A heading or plan name only on the pricing page, e.g. Premium",
  },
  {
    id: "signup",
    label: "Reach sign-up",
    goal: "Find how to create an account and reach the sign-up form. Do not submit it.",
    textHint: "Text only on the sign-up form, e.g. Create your account",
  },
  {
    id: "contact",
    label: "Contact the business",
    goal: "Find a way to contact the business and reach the contact form or the page with a phone number or email address.",
    textHint: "Text only on the contact page, e.g. Send us a message",
  },
  {
    id: "book",
    label: "Book a service",
    goal: "Find how to book an appointment or service and reach the page where a time or date is chosen. Do not confirm a booking.",
    textHint: "Text only on the booking step, e.g. Choose a time",
  },
  {
    id: "checkout",
    label: "Guest checkout",
    goal: "Add any one product to the cart and reach the checkout page as a guest, stopping before any payment step.",
    textHint: "Text only on checkout, e.g. Shipping address",
  },
];

function setFieldValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // Uncontrolled fields: set through the native setter so any listener sees a real input.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function TaskTemplates({
  goalFieldId = "task-goal",
  textFieldId = "task-success-text",
}: {
  goalFieldId?: string;
  textFieldId?: string;
}) {
  function apply(template: TaskTemplate) {
    const goal = document.getElementById(goalFieldId);
    const text = document.getElementById(textFieldId);
    if (goal instanceof HTMLTextAreaElement || goal instanceof HTMLInputElement) setFieldValue(goal, template.goal);
    if (text instanceof HTMLInputElement) {
      setFieldValue(text, "");
      text.placeholder = template.textHint;
      text.focus();
    }
  }

  return (
    <div role="group" aria-labelledby="task-templates-label" className="space-y-1.5">
      <p id="task-templates-label" className="text-xs text-muted-foreground">
        Start from a common goal, then type text that only appears on your site&rsquo;s final page:
      </p>
      <div className="flex flex-wrap gap-2">
        {TASK_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => apply(t)}
            className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
