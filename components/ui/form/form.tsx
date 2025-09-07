// This file serves as the main entry point for form components
// It re-exports all form-related components and types

export { FormProvider as Form } from "./form-provider"
export { FormField, type FormFieldProps } from "./form-field"
export { FormLabel, type FormLabelProps } from "./form-label"
export { FormControl, type FormControlProps } from "./form-control"
export { FormDescription, type FormDescriptionProps } from "./form-description"
export { FormMessage, type FormMessageProps } from "./form-message"
export { FormItem, type FormItemProps } from "./form-item"
export { FormInput, type FormInputProps } from "./form-input"
export { FormTextarea, type FormTextareaProps } from "./form-textarea"
export { FormSelect, type FormSelectProps } from "./form-select"

// Re-export form field context and hooks
export { useFormField, type FormFieldContextValue } from "./form-field"

// Re-export react-hook-form components and types
export {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  type UseFormReturn,
  type UseFormProps,
  type FieldError,
  type FieldErrors,
  type UseFieldArrayReturn,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormGetValues,
  type UseFormTrigger,
  type UseFormReset,
  type UseFormClearErrors,
  type UseFormSetError,
  type UseFormHandleSubmit,
  type UseFormWatch,
  type SubmitHandler,
  type SubmitErrorHandler,
  type DefaultValues,
  type Resolver,
  type RegisterOptions,
} from "react-hook-form"
