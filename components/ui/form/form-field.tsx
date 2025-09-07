import * as React from "react"
import { cn } from "../../../lib/utils"
import { type FieldError, type FieldErrorsImpl, type Merge } from "react-hook-form"

/**
 * Type for the error prop that can be either a string, FieldError, or undefined
 */
export type FormFieldError = 
  | string 
  | FieldError 
  | Merge<FieldError, FieldErrorsImpl<Record<string, unknown>>> 
  | undefined
  | { message?: string | React.ReactNode | (() => string) }

/**
 * The shape of the form field context value.
 * This is used to provide form field state to child components.
 */
export type FormFieldContextValue = {
  /** The name of the form field */
  name: string
  
  /** Whether the field is in an invalid state */
  invalid: boolean
  
  /** Whether the field has been modified by the user */
  isDirty: boolean
  
  /** Whether the field has been touched by the user */
  isTouched: boolean
  
  /** Error information for the field, if any */
  error?: {
    /** The error message to display */
    message?: string | FieldError | Merge<FieldError, FieldErrorsImpl<Record<string, unknown>>>
    /** Additional error details */
    [key: string]: unknown
  }
  
  /** Whether the field is required */
  required: boolean
  
  /** Unique ID for the form item element */
  formItemId: string
  
  /** Unique ID for the form description element */
  formDescriptionId: string
  
  /** Unique ID for the form message element */
  formMessageId: string
}

/**
 * Context for form field state management.
 * This is used internally by form field components.
 */
export const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

/**
 * Hook to access the form field context.
 * Must be used within a `FormField` component.
 * 
 * @returns The form field context value
 * @throws Will throw an error if used outside of a `FormField` component
 */
export const useFormField = () => {
  const context = React.useContext(FormFieldContext)
  if (!context) {
    throw new Error("useFormField must be used within a FormField")
  }
  return context
}

/**
 * Props for the FormField component
 */
// Define the type for the event handlers that will be used by form inputs
type FormFieldEventHandlers = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

export type FormFieldProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onBlur'> & FormFieldEventHandlers & {
  /**
   * The name of the form field. This will be used as the key in the form data.
   */
  name: string
  
  /**
   * Form field control(s) to render within the field.
   */
  children?: React.ReactNode
  
  /**
   * Label text for the form field.
   */
  label?: string
  
  /**
   * Error message or error object to display for the field.
   * This will also set the field's `invalid` state to `true`.
   */
  error?: FormFieldError
  
  /**
   * Whether the field is in an invalid state.
   * This can be used to manually control the field's validation state.
   */
  invalid?: boolean
  
  /**
   * Whether the field has been modified by the user.
   */
  isDirty?: boolean
  
  /**
   * Whether the field has been touched by the user.
   */
  isTouched?: boolean
  
  /**
   * Whether the field is required.
   */
  required?: boolean
  
  /**
   * Additional class name for the form field container.
   */
  className?: string
  
  /**
   * Callback when the field's value changes.
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  
  /**
   * Callback when the field loses focus.
   * Uses a more generic FocusEvent type that's compatible with any HTML element.
   */
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void
  
  /**
   * Ref for the form field.
   */
  ref?: React.Ref<HTMLDivElement>
}

/**
 * A form field component that provides context to form controls.
 * This component should wrap form controls that need access to form field state.
 */
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
  // These event handlers will be used by form inputs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange: _onChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBlur: _onBlur,
  ...divProps
}: FormFieldProps) => {
  const formItemId = React.useId()
  const formDescriptionId = `${formItemId}-description`
  const formMessageId = `${formItemId}-message`
  
  // Normalize error to string or undefined
  const errorMessage = React.useMemo(() => {
    if (!error) return undefined
    if (typeof error === 'string') return error
    if (error && typeof error === 'object') {
      // Handle FieldError from react-hook-form
      if ('message' in error) {
        const message = error.message
        if (message === undefined) return undefined
        if (typeof message === 'string') return message
        if (typeof message === 'function') return message()
        if (React.isValidElement(message)) return '' // Return empty string for React elements
      }
      // Handle other error objects
      if ('toString' in error) return error.toString()
      return 'Invalid field'
    }
    return String(error)
  }, [error])
  
  const contextValue = React.useMemo<FormFieldContextValue>(
    () => ({
      name,
      invalid: invalid || !!errorMessage,
      isDirty,
      isTouched,
      error: errorMessage ? { message: errorMessage } : undefined,
      formItemId,
      formDescriptionId,
      formMessageId,
      required,
    }),
    [name, errorMessage, invalid, isDirty, isTouched, formItemId, formDescriptionId, formMessageId, required]
  )

  // No need to destructure again, we already have all props properly typed
  
  // divProps now only contains valid HTML div attributes

  return (
    <div 
      className={cn("space-y-2", className)} 
      {...divProps}
    >
      <FormFieldContext.Provider value={contextValue}>
        {label && (
          <div className="flex items-center justify-between">
            <label 
              htmlFor={formItemId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        )}
        {children}
      </FormFieldContext.Provider>
    </div>
  )
}

FormField.displayName = "FormField"
