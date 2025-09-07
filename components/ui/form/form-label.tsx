import * as React from "react"
import { cn } from "../../../lib/utils"
import { Label } from "../label"
import { useFormField } from "./form-field"

export type FormLabelProps = React.ComponentProps<typeof Label> & {
  /** Whether the field is required */
  required?: boolean
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    const { invalid, formItemId } = useFormField()
    return (
      <Label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          invalid && "text-destructive",
          className
        )}
        data-invalid={invalid}
        htmlFor={formItemId}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
    )
  }
)
FormLabel.displayName = "FormLabel"
