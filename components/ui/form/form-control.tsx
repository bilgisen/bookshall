import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../../lib/utils"
import { useFormField } from "./form-field"

export type FormControlProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
}

export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const { invalid, formItemId, formDescriptionId, formMessageId } = useFormField()
    const Comp = asChild ? Slot : "div"
    
    return (
      <Comp
        ref={ref}
        id={formItemId}
        aria-describedby={`${formDescriptionId} ${formMessageId}`}
        aria-invalid={invalid}
        className={cn("relative", invalid && "text-destructive", className)}
        data-invalid={invalid}
        {...props}
      />
    )
  }
)
FormControl.displayName = "FormControl"
