// components/books/sections/book-title-section.tsx
"use client";

import { useFormContext } from "react-hook-form"; // Add this import
import { FormField } from "@/components/ui/form-field";

export function BookTitleSection() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <FormField 
        {...register("title", { required: true })}
        label="Title"
        error={errors.title?.message as string}
        required
      />
      <FormField 
        {...register("subtitle")}
        label="Subtitle"
        error={errors.subtitle?.message as string}
      />
    </div>
  );
}