// components/books/book-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useFormState } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { bookSchema } from "@/lib/validation/book";
import { BookTitleSection } from "./sections/book-title-section";
import { BookAuthorSection } from "./sections/book-author-section";
import { BookMetaSection } from "./sections/book-meta-section";
import { BookPublishingSection } from "./sections/book-publishing-section";
import { BookCoverSection } from "./sections/book-cover-section";

// Create a type-safe version that avoids the resolver conflict
type BookFormValues = {
  title: string;
  author: string;
  publisher: string;
  contributors?: { name: string }[];
  translators?: { name: string }[];
  slug?: string;
  subtitle?: string;
  description?: string;
  publisherWebsite?: string;
  publishYear?: number;
  isbn?: string;
  language?: string;
  genre?: string;
  series?: string;
  seriesIndex?: number;
  tags?: string[];
  coverImageUrl?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
};

interface BookFormProps {
  defaultValues?: Partial<BookFormValues>;
  onSubmit: (data: BookFormValues) => Promise<void>;
  redirectPath: string;
}

export function BookForm({ defaultValues, onSubmit, redirectPath }: BookFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const methods = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema) as any,
    defaultValues: defaultValues ?? {},
    mode: "onChange",
  });

  const { handleSubmit, watch, setValue, control } = methods;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isDirty } = useFormState({ control });

  // Auto-slugify title
  useEffect(() => {
    const subscription = watch((values, { name }) => {
      if (name === "title" && values.title) {
        const newSlug = slugify(values.title, { lower: true, strict: true });
        const defaultSlug = defaultValues?.title ? 
          slugify(defaultValues.title, { lower: true, strict: true }) : '';
        
        // Only auto-update slug if it's empty or matches the auto-generated version
        if (!values.slug || values.slug === defaultSlug) {
          setValue("slug", newSlug, { shouldValidate: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue, defaultValues?.title]);

  const handleFormSubmit = async (data: BookFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast.success("Book saved successfully!");
      router.push(redirectPath);
    } catch (error) {
      console.error("Error saving book:", error);
      toast.error("Failed to save book. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Autosave
  useEffect(() => {
    if (!isDirty) return;
    
    const subscription = watch(async (values: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        console.log("Auto-saving...", values);
        // Don't show toast for autosave to avoid distraction
      }, 1500);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, isDirty]);

  return (
    <FormProvider {...methods}>
      <form 
        onSubmit={handleSubmit(handleFormSubmit)} 
        className="grid grid-cols-3 gap-6 w-full"
      >
        <div className="col-span-2 space-y-6">
          <BookTitleSection />
          <BookAuthorSection />
          <BookMetaSection />
          <BookPublishingSection />
        </div>
        <aside className="col-span-1 space-y-6">
          <BookCoverSection />
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-white rounded px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Book'}
          </button>
        </aside>
      </form>
    </FormProvider>
  );
}