import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Dossier: flat ink, near-square corners, instant ink-blue focus ring, 150ms color.
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out)] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary = carbon-ink blue. One per view. Hover deepens the ink; press sinks 1px.
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)]",
        accent:
          "bg-primary text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)]",
        outline:
          "border-foreground/60 bg-card text-foreground hover:border-foreground aria-expanded:border-foreground/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:outline-[var(--severity-critical)] dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-sm px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5 text-[0.9375rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-sm",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// The 6th interaction state (DESIGN.md §Interaction Completeness). `loading` is
// visually distinct from `disabled` — it keeps full opacity, shows a spinner, and
// sets aria-busy — so a working button never reads as an inert one.
function ButtonSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-30" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && "cursor-wait opacity-100!",
      )}
      {...props}
    >
      {loading ? <ButtonSpinner /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
