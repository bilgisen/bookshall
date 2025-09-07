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
        name="author"
        label="Author"
        error={errors.author?.message as string}
        required
      >
        <input
          {...register("author", { required: "Author is required" })}
          placeholder="Main Author"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </FormField>

      <FormField
        name="publisher"
        label="Publisher"
        error={errors.publisher?.message as string}
        required
      >
        <input
          {...register("publisher", { required: "Publisher is required" })}
          placeholder="Publisher Name"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </FormField>

      <FormField
        name="contributor"
        label="Contributor (Optional)"
        error={errors.contributor?.message as string}
      >
        <input
          {...register("contributor")}
          placeholder="Contributor Name"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </FormField>

      <FormField
        name="translator"
        label="Translator (Optional)"
        error={errors.translator?.message as string}
      >
        <input
          {...register("translator")}
          placeholder="Translator Name"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </FormField>
    </section>
  );
}

export default BookAuthorSection;