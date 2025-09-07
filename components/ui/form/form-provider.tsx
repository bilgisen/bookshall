import * as React from "react"
import { 
  FormProvider as RHFProvider, 
  type UseFormReturn, 
  type FieldValues,
  type SubmitHandler,
  type SubmitErrorHandler
} from "react-hook-form"
import { cn } from "@/lib/utils"

export interface FormProps<T extends FieldValues> 
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> {
  /**
   * The form methods from react-hook-form's useForm hook
   */
  form: UseFormReturn<T>
  
  /**
   * Function called when the form is submitted with valid data
   */
  onSubmit: SubmitHandler<T>
  
  /**
   * Function called when the form submission fails validation
   */
  onError?: SubmitErrorHandler<T>
  
  /**
   * Whether to disable the form submission
   */
  disabled?: boolean
  
  /**
   * Additional class name for the form element
   */
  className?: string
  
  /**
   * Whether to prevent the default form submission behavior
   * @default true
   */
  preventDefault?: boolean
}

/**
 * A form component that provides form context to all child form fields
 * and handles form submission
 */
export function Form<T extends FieldValues>({
  form,
  onSubmit,
  onError,
  disabled = false,
  preventDefault = true,
  className,
  children,
  ...props
}: React.PropsWithChildren<FormProps<T>>) {
  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    if (preventDefault) {
      e.preventDefault()
    }
    return form.handleSubmit(onSubmit, onError)(e)
  }, [form, onSubmit, onError, preventDefault])

  return (
    <RHFProvider {...form}>
      <form
        onSubmit={handleSubmit}
        className={cn("space-y-6", className)}
        {...props}
      >
        <fieldset 
          disabled={disabled} 
          className={cn("space-y-6", disabled && "opacity-70 cursor-not-allowed")}
        >
          {children}
        </fieldset>
      </form>
    </RHFProvider>
  )
}

// Export a default instance with a generic type parameter
export function FormProvider<T extends FieldValues>({
  children,
  ...props
}: React.PropsWithChildren<FormProps<T>>) {
  return <Form<T> {...props}>{children}</Form>
}

export default Form
