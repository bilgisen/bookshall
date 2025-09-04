"use client";

import { FormField } from "@/components/ui/form-field";

export function BookPublishingSection() {
  return (
    <div className="space-y-4">
      <FormField name="publisher" label="Publisher" />
      <FormField name="series" label="Series" />
      <FormField name="seriesIndex" label="Series Index" type="number" />
      <FormField name="language" label="Language" />
      <FormField name="year" label="Publication Year" type="number" />
      <FormField name="isbn" label="ISBN" />
    </div>
  );
}
