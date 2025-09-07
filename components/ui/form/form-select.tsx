import * as React from "react"
import { cn } from "../../../lib/utils"
import { useFormField } from "./form-field"

export type FormSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "aria-invalid"
> & {
  /**
   * The content of the select element.
   */
  children: React.ReactNode;
  /**
   * The class name of the select element.
   */
  className?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, children, ...props }, ref) => {
    const { formItemId, invalid } = useFormField()
    
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive text-destructive focus:ring-destructive/50",
          className
        )}
        ref={ref}
        id={formItemId}
        aria-invalid={invalid}
        {...props}
      >
        {children}
      </select>
    )
  }
)
FormSelect.displayName = "FormSelect"
