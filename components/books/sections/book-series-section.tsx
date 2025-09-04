// components/books/sections/book-series-section.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";

export function BookSeriesSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <section className="p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-semibold">Series & Details</h2>

      <FormField
        label="Series"
        {...register("series")}
        error={errors.series}
        placeholder="Series name"
      />

      <FormField
        label="Series Index"
        {...register("seriesIndex")}
        error={errors.seriesIndex}
        placeholder="e.g. 1"
        type="number"
      />

      <FormField
        label="Language"
        {...register("language")}
        error={errors.language}
        placeholder="ISO code (e.g. en, tr)"
      />

      <FormField
        label="Publication Year"
        {...register("year")}
        error={errors.year}
        placeholder="e.g. 2024"
        type="number"
      />

      <FormField
        label="ISBN"
        {...register("isbn")}
        error={errors.isbn}
        placeholder="ISBN number"
      />
    </section>
  );
}
