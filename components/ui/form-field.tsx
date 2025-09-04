// components/ui/form-field.tsx
"use client";

import React from "react";
import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

// Define the error type to match what react-hook-form provides
type FormFieldError = 
  | string 
  | FieldError 
  | Merge<FieldError, FieldErrorsImpl<any>>
  | undefined;

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FormFieldError;
}

export function FormField({ label, error, ...props }: FormFieldProps) {
  const id = props.id || props.name;

  // Helper function to extract error message
  const getErrorMessage = (err: FormFieldError): string | undefined => {
    if (!err) return undefined;
    if (typeof err === "string") return err;
    if ("message" in err) return err.message as string;
    return undefined;
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-muted-foreground/70"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`mt-1 w-full border px-3 py-2 rounded text-md ${
          errorMessage ? "border-red-500" : "border-gray-300"
        }`}
      />
      {errorMessage && (
        <p className="text-red-500 text-sm mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
}