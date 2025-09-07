import * as React from "react"
import { cn } from "../../../lib/utils"

export type FormItemProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Whether to add margin bottom to the form item for better spacing
   * @default true
   */
  spacing?: boolean
}

/**
 * A container for form fields that provides consistent spacing and layout
 */
export const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, spacing = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          spacing && "mb-4 space-y-2 last:mb-0",
          className
        )}
        {...props}
      />
    )
  }
)
FormItem.displayName = "FormItem"
