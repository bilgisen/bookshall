// components/books/sections/book-author-section.tsx
"use client";

import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { get } from "react-hook-form"; // Add this import

export function BookAuthorSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  // Contributors
  const { fields: contributorFields, append: addContributor, remove: removeContributor } =
    useFieldArray({ control, name: "contributors" });

  // Translators
  const { fields: translatorFields, append: addTranslator, remove: removeTranslator } =
    useFieldArray({ control, name: "translators" });

  return (
    <section className="p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-semibold">Authors & Team</h2>

      <FormField
        label="Author"
        {...register("author")}
        error={errors.author}
        placeholder="Main Author"
      />

      <FormField
        label="Publisher"
        {...register("publisher")}
        error={errors.publisher}
        placeholder="Publisher Name"
      />

      {/* Contributors */}
      <div>
        <h3 className="text-md font-medium">Contributors</h3>
        {contributorFields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2 mb-2">
            <FormField
              label={`Contributor ${index + 1}`}
              {...register(`contributors.${index}.name` as const)}
              error={get(errors, `contributors.${index}.name`)} // Fixed this line
              placeholder="Contributor Name"
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeContributor(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" onClick={() => addContributor({ name: "" })}>
          + Add Contributor
        </Button>
      </div>

      {/* Translators */}
      <div>
        <h3 className="text-md font-medium">Translators</h3>
        {translatorFields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2 mb-2">
            <FormField
              label={`Translator ${index + 1}`}
              {...register(`translators.${index}.name` as const)}
              error={get(errors, `translators.${index}.name`)} // Fixed this line
              placeholder="Translator Name"
            />
            <Button
              type="button"
              variant="destructive"
              onClick={() => removeTranslator(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" onClick={() => addTranslator({ name: "" })}>
          + Add Translator
        </Button>
      </div>
    </section>
  );
}