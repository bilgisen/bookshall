"use client";

import { useFormContext } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";

export function BookPublishingSection() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <FormField 
        {...register("series")}
        label="Series"
        error={errors.series?.message as string}
      />
      <FormField 
        {...register("seriesIndex", { valueAsNumber: true })}
        label="Series Index"
        type="number"
        error={errors.seriesIndex?.message as string}
      />
      <FormField 
        {...register("language")}
        label="Language"
        error={errors.language?.message as string}
      />
      <FormField 
        {...register("publishYear", { valueAsNumber: true })}
        label="Publication Year"
        type="number"
        error={errors.publishYear?.message as string}
      />
      <FormField 
        {...register("isbn")}
        label="ISBN"
        error={errors.isbn?.message as string}
      />
    </div>
  );
}
