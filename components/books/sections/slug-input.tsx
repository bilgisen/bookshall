"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import slugify from "slugify";

interface SlugInputProps {
  className?: string;
}

export function SlugInput({ className }: SlugInputProps) {
  const { register, watch, formState: { errors }, setValue } = useFormContext();
  const slugValue = watch("slug");
  const titleValue = watch("title");
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Auto-update slug when title changes (only if slug is empty or matches the auto-generated one)
  useEffect(() => {
    if (titleValue) {
      const generatedSlug = slugify(titleValue, {
        lower: true,
        strict: true,
        trim: true,
        replacement: '-',
        remove: /[*+~.()'"!:@]/g,
        locale: 'tr'
      });
      
      // Only auto-update if slug is empty or matches the auto-generated version
      if (!slugValue || slugValue === generatedSlug) {
        setValue("slug", generatedSlug, { shouldValidate: true });
      }
    }
  }, [titleValue, setValue, slugValue]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="slug">URL Slug</Label>
        <span className="text-xs text-muted-foreground">
          {slugValue ? `${slugValue.length}/50` : '0/50'}
        </span>
      </div>
      
      <div className="relative">
        <Input
          id="slug"
          placeholder="book-title"
          maxLength={50}
          {...register("slug", {
            required: "URL slug is required",
            pattern: {
              value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: "Only lowercase letters, numbers, and hyphens are allowed"
            },
            minLength: {
              value: 3,
              message: "Slug must be at least 3 characters"
            },
            maxLength: {
              value: 50,
              message: "Slug must be less than 50 characters"
            }
          })}
          className={cn(
            "font-mono text-sm",
            errors.slug && "border-destructive"
          )}
        />
      </div>
      
      {/* Preview */}
      <div className="mt-1">
        <p className="text-xs text-muted-foreground mb-1">Preview:</p>
        <div className="bg-muted rounded-md p-2 text-sm overflow-x-auto">
          <span className="text-muted-foreground">{siteUrl}/books/</span>
          <span className={cn(
            "font-mono",
            errors.slug ? "text-destructive" : "text-foreground"
          )}>
            {slugValue || "book-slug"}
          </span>
        </div>
      </div>
      
      {/* Error message */}
      {errors.slug && (
        <p className="text-xs text-destructive mt-1">
          {errors.slug.message as string}
        </p>
      )}
    </div>
  );
}
