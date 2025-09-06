// components/books/sections/book-author-section.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";

export function BookAuthorSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <section className="p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-semibold">Authors & Team</h2>

      <FormField
        label="Author"
        {...register("author", { required: "Author is required" })}
        error={errors.author?.message as string}
        placeholder="Main Author"
        required
      />

      <FormField
        label="Publisher"
        {...register("publisher", { required: "Publisher is required" })}
        error={errors.publisher?.message as string}
        placeholder="Publisher Name"
        required
      />

      {/* Contributor */}
      <FormField
        label="Contributor (Optional)"
        {...register("contributor")}
        error={errors.contributor?.message as string}
        placeholder="Contributor Name"
      />

      {/* Translator */}
      <FormField
        label="Translator (Optional)"
        {...register("translator")}
        error={errors.translator?.message as string}
        placeholder="Translator Name"
      />
    </section>
  );
}

export default BookAuthorSection;