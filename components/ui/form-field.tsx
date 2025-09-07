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
type FormFieldProps = {
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
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'name'>

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
  ...props
}: FormFieldProps) => {
  const form = useFormContext()
  const formItemId = `${name}-form-item`
  const formDescriptionId = `${name}-form-item-description`
  const formMessageId = `${name}-form-item-message`

  const contextValue = React.useMemo<FormFieldContextValue>(
    () => ({
      name,
      invalid,
      isDirty,
      isTouched,
      error,
      formItemId,
      formDescriptionId,
      formMessageId,
      form,
    }),
    [name, invalid, isDirty, isTouched, error, formItemId, formDescriptionId, formMessageId, form],
  )

  // Clone children and pass through form field props
  let childrenWithProps = children;
  
  if (children) {
    childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        // Create a type-safe way to handle props
        const element = child as React.ReactElement<Record<string, unknown>>;
        const childProps: Record<string, unknown> = {
          id: formItemId,
          'aria-invalid': invalid,
          'aria-describedby': error ? formMessageId : undefined,
        };
        
        // Define the props we want to copy
        const childPropsToCopy = ['required', 'disabled', 'placeholder'] as const;
        
        childPropsToCopy.forEach(prop => {
          if (prop in element.props) {
            childProps[prop] = element.props[prop];
          }
        });
        
        return React.cloneElement(child, childProps);
      }
      return child;
    });
  }

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label htmlFor={formItemId} className={cn(invalid && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        {childrenWithProps}
        {error && (
          <p className="text-sm font-medium text-destructive" id={formMessageId}>
            {typeof error === 'string' 
              ? error 
              : error && typeof error === 'object' && error !== null && 'message' in error 
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
        id={formItemId}
        className={cn("relative", className)}
        aria-describedby={
          [formDescriptionId, formMessageId]
            .filter(Boolean)
            .join(' ') || undefined
        }
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
      className={cn(
        "text-sm text-muted-foreground",
        "mt-1.5",
        className
      )}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

// Form Message Component
export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Additional class name */
  className?: string
  /** Custom error message to display */
  children?: React.ReactNode
}

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  FormMessageProps
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? (typeof error === 'string' ? error : error?.message) : children

  if (!body) {
    return null
  }

  // Handle different types of body content
  const renderBody = (): React.ReactNode => {
    if (React.isValidElement(body)) {
      return body;
    }
    if (typeof body === 'string' || typeof body === 'number') {
      return body;
    }
    if (error) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        return String(error.message);
      }
      return String(error);
    }
    return children ? children : null;
  };

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "text-sm font-medium text-destructive",
        "mt-1.5",
        className
      )}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {renderBody()}
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