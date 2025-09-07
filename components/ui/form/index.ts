// Re-export form components and their types
export { FormProvider as Form } from "react-hook-form"

// Export all types from react-hook-form
export type {
  // Core types
  FieldValues,
  FieldError,
  FieldErrors,
  FieldPath,
  
  // Form types
  UseFormReturn,
  UseFormProps,
  FormState,
  DefaultValues,
  Resolver,
  
  // Controller types
  ControllerProps,
  Control,
  
  // Field array types
  UseFieldArrayReturn,
  UseFieldArrayProps,
  
  // Controller hook types
  UseControllerProps,
  UseControllerReturn,
  
  // Form state types
  UseFormStateReturn,
  UseFormStateProps,
  
  // Input types
  RegisterOptions,
  
  // Handler types
  SubmitHandler,
  SubmitErrorHandler,
  
  // Form methods
  UseFormRegister,
  UseFormSetValue,
  UseFormGetValues,
  UseFormTrigger,
  UseFormReset,
  UseFormClearErrors,
  UseFormSetError,
  UseFormHandleSubmit,
  UseFormWatch,
  
  // Aliases
  UseFormReturn as FormProps,
  FieldError as FormFieldError,
} from "react-hook-form"

// Re-export form components
export { FormField, type FormFieldProps } from "./form-field"
export { FormLabel, type FormLabelProps } from "./form-label"
export { FormControl, type FormControlProps } from "./form-control"
export { FormDescription, type FormDescriptionProps } from "./form-description"
export { FormMessage, type FormMessageProps } from "./form-message"
export { FormItem, type FormItemProps } from "./form-item"

// Re-export input components
export { FormInput, type FormInputProps } from "./form-input"
export { FormTextarea, type FormTextareaProps } from "./form-textarea"
export { FormSelect, type FormSelectProps } from "./form-select"

// Re-export react-hook-form components
export {
  Controller,
  FormProvider,
  useFormContext,
  useForm,
  useFormState,
  useWatch,
  useController,
  useFieldArray,
} from "react-hook-form"

// Export hooks and context
export { useFormField, FormFieldContext } from "./form-field"
