// components/books/sections/book-cover-section.tsx
"use client";

import { Controller, useFormContext } from "react-hook-form";
import { ImageUploadField } from "@/components/books/sections/image-upload-field"; // Fixed path

export function BookCoverSection() {
  const { control } = useFormContext();
  
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <label className="text-md font-medium text-muted-foreground/70">Book Cover</label>
        <Controller
          name="coverImageUrl" // Changed from "coverUrl" to match your schema
          control={control}
          render={({ field }) => (
            <ImageUploadField value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
    </section>
  );
}