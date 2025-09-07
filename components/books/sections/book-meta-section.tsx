// components/books/sections/book-meta-section.tsx
"use client";

import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOOK_GENRES } from "@/lib/validation/book";

export function BookMetaSection() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  // Watch tags to handle input changes
  const tagsInput = watch("tags") || [];
  const tagsString = Array.isArray(tagsInput) ? tagsInput.join(", ") : tagsInput || "";

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Split by comma and clean up the tags
    const tagsArray = value
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    setValue("tags", tagsArray, { shouldValidate: true });
  };

  return (
    <section className="p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-semibold">Meta Information</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground/70">
          Genre
        </label>
        <Controller
          name="genre"
          control={control}
          render={({ field }) => (
            <Select 
              onValueChange={(value) => field.onChange(value === "NONE" ? "" : value)} 
              value={field.value || "NONE"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {BOOK_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre.split("_").map(word => 
                      word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.genre && (
          <p className="text-red-500 text-sm mt-1">
            {errors.genre.message?.toString()}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground/70">
          Tags
        </label>
        <input
          type="text"
          value={tagsString}
          onChange={handleTagsChange}
          className="w-full border px-3 py-2 rounded text-md"
          placeholder="Comma-separated tags (e.g., fiction, bestseller, 2024)"
        />
        {errors.tags && (
          <p className="text-red-500 text-sm mt-1">
            {errors.tags.message?.toString()}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground/70">
          Description
        </label>
        <textarea
          {...register("description")}
          className="w-full border px-3 py-2 rounded text-md min-h-[120px]"
          placeholder="Book description..."
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.description.message?.toString()}
          </p>
        )}
      </div>
    </section>
  );
}