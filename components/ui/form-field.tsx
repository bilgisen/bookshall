import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  type FieldValues,
  useFormContext,
  type FieldError,
  type Merge,
  type FieldErrorsImpl,
  type UseFormReturn,
} from "react-hook-form"

// Form Context
type FormFieldError = string | { message?: string | (() => string) } | FieldError | Merge<FieldError, FieldErrorsImpl<Record<string, unknown>>> | undefined

interface FormFieldContextValue {
  name: string
  invalid: boolean
  isDirty: boolean
  isTouched: boolean
  error?: FormFieldError
  formItemId: string
  formDescriptionId: string
  formMessageId: string
  form: UseFormReturn<FieldValues>
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const useFormField = () => {
  const context = React.useContext(FormFieldContext)
  if (!context) {
    throw new Error("useFormField must be used within a FormField")
  }
  return context
}

// Form Field Component
interface FormFieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'name'> {
  /** The name of the form field */
  name: string
  /** Form field control(s) to render within the field */
  children?: React.ReactNode
  /** Label text for the form field */
  label?: string
  /** Error message or error object to display */
  error?: FormFieldError
  /** Whether the field is in an invalid state */
  invalid?: boolean
  /** Whether the field has been modified by the user */
  isDirty?: boolean
  /** Whether the field has been touched by the user */
  isTouched?: boolean
  /** Whether the field is required */
  required?: boolean
  /** Additional class name for the form field container */
  className?: string
  /** Additional props for the input element */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export const FormField = ({
  name,
  children,
  label,
  error,
  invalid = false,
  isDirty = false,
  isTouched = false,
  required = false,
  className,
  inputProps = {},
  ...props
}: FormFieldProps) => {
  const form = useFormContext()
  const formItemId = `${name}-form-item`
  const formDescriptionId = `${name}-form-item-description`
  const formMessageId = `${name}-form-item-message`

  const contextValue = React.useMemo<FormFieldContextValue>(
    () => ({
      name,
      invalid: invalid || !!error,
      isDirty: isDirty || false,
      isTouched: isTouched || false,
      error,
      formItemId,
      formDescriptionId,
      formMessageId,
      form,
    }),
    [name, invalid, isDirty, isTouched, error, formItemId, formDescriptionId, formMessageId, form],
  )

  const renderInput = () => {
    if (children) {
      return React.Children.map(children, (child) => {
        if (React.isValidElement<React.HTMLAttributes<HTMLElement>>(child)) {
          const childProps: Partial<React.HTMLAttributes<HTMLElement> & { required?: boolean }> = {
            id: `${name}-input`,
            'aria-invalid': invalid || !!error ? 'true' : 'false',
            'aria-describedby': error ? formMessageId : undefined,
            required,
          };
          
          // Manually assign props to avoid spread issues
          const propsToAssign: React.HTMLProps<HTMLElement> = { ...childProps };
          Object.entries(child.props).forEach(([key, value]) => {
            if (value !== undefined) {
              // Safely assign props with proper typing
              (propsToAssign as Record<string, unknown>)[key] = value;
            }
          });
          
          return React.cloneElement(child, propsToAssign);
        }
        return child;
      });
    }

    return (
      <input
        id={`${name}-input`}
        aria-invalid={invalid || !!error}
        aria-describedby={error ? formMessageId : undefined}
        required={required}
        {...inputProps}
        {...props}
      />
    )
  }

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label htmlFor={`${name}-input`} className={cn(invalid && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          {renderInput()}
        </div>
        {error && (
          <p className="text-sm font-medium text-destructive" id={formMessageId}>
            {typeof error === 'string' 
              ? error 
              : error && typeof error === 'object' && 'message' in error 
                ? typeof error.message === 'string'
                  ? error.message
                  : typeof error.message === 'function'
                    ? error.message()
                    : 'Invalid field'
              : 'Invalid field'}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  )
}

// Form Label Component
export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the field is required */
  required?: boolean
  /** Additional class name */
  className?: string
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    const { invalid, formItemId } = useFormField()
    return (
      <Label
        ref={ref}
        htmlFor={formItemId}
        className={cn(
          "block text-sm font-medium text-foreground",
          invalid && "text-destructive",
          className
        )}
        data-invalid={invalid}
        aria-required={required}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
    )
  }
)
FormLabel.displayName = "FormLabel"

// Form Control Component
export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional class name */
  className?: string
}

export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, ...props }, ref) => {
    const { 
      invalid, 
      formItemId, 
      formDescriptionId, 
      formMessageId,
    } = useFormField()
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-md shadow-sm",
          invalid && "border-red-500",
          className
        )}
        id={formItemId}
        aria-describedby={`${formDescriptionId} ${formMessageId}`}
        aria-invalid={invalid}
        {...props}
      />
    )
  }
)
FormControl.displayName = "FormControl"

// Form Description Component
export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Additional class name */
  className?: string
}

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  FormDescriptionProps
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

// Form Message Component
export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Additional class name */
  className?: string
  /** Custom message content */
  children?: React.ReactNode
}

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  FormMessageProps
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = children || (error ? String(error) : null)

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

// Form Item Component
export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional class name */
  className?: string
}

export const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "space-y-2",
          className
        )}
        {...props}
      />
    )
  }
)
FormItem.displayName = "FormItem"

export { useFormField }