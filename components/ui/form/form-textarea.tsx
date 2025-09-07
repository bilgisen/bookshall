import * as React from "react"
import { cn } from "../../../lib/utils"
import { useFormField } from "./form-field"

export type FormTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "aria-invalid"
>

export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaProps
>(({ className, ...props }, ref) => {
  const { formItemId, invalid } = useFormField()
  
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-destructive text-destructive focus-visible:ring-destructive/50",
        className
      )}
      ref={ref}
      id={formItemId}
      aria-invalid={invalid}
      {...props}
    />
  )
})
FormTextarea.displayName = "FormTextarea"
