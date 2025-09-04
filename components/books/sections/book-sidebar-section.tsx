// components/books/sections/book-sidebar-section.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";

interface Props {
  isSubmitting?: boolean;
}

export function BookSidebarSection({ isSubmitting }: Props) {
  const { register } = useFormContext();

  return (
    <aside className="p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-semibold">Options</h2>

      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("isPublished")} />
        <span>Published</span>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("isFeatured")} />
        <span>Featured</span>
      </label>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : "Save Book"}
      </Button>
    </aside>
  );
}
