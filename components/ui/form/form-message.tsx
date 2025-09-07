import * as React from "react"
import { cn } from "../../../lib/utils"
import { useFormField } from "./form-field"

export type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement>

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  FormMessageProps
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const errorMessage = error?.message
  const body = errorMessage ? String(errorMessage) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "text-sm font-medium text-destructive",
        className
      )}
      aria-live="polite"
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"
