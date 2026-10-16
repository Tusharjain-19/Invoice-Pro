import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
        secondary: "border-transparent bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary",
        destructive: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive",
        outline: "text-foreground border-border",
        success: "border-transparent bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-secondary",
        warning: "border-transparent bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning",
        info: "border-transparent bg-info/10 text-info dark:bg-info/20 dark:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
