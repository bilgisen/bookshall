// components/books/sections/book-title-section.tsx
"use client";

import { useFormContext } from "react-hook-form"; // Add this import
import { FormField } from "@/components/ui/form-field";

export function BookTitleSection() {
  const { register } = useFormContext(); // Get register from context

  return (
    <div className="space-y-4">
      <FormField 
        {...register("title")} // Add register
        label="Title" 
      />
      <FormField 
        {...register("subtitle")} // Add register
        label="Subtitle" 
      />
    </div>
  );
}