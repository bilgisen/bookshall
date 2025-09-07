import * as React from "react"
import { cn } from "../../../lib/utils"
import { useFormField } from "./form-field"

export type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  FormDescriptionProps
>(({ className, ...props }, ref) => {
  const { invalid, formDescriptionId } = useFormField()
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn(
        "text-sm text-muted-foreground",
        invalid && "text-destructive/80",
        className
      )}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"
