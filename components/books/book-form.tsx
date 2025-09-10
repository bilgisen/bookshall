// components/books/book-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useForm, 
  FormProvider, 
  SubmitHandler,
  useFormContext,
  useFieldArray,
  useWatch
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Types and Schemas
import { bookFormSchema } from "@/lib/validation/book";
import type { BookFormValues } from "@/lib/validation/book";
import type { Book } from "@/types/book";

// Components
import { BookCoverSection } from "./sections/book-cover-section";
import { MainSection } from "./sections/main-section";
import { AdditionalSection } from "./sections/additional-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BookFormProps {
  defaultValues?: Partial<Book>;
  onSubmit: (data: BookFormValues) => Promise<void>;
  isSubmitting?: boolean;
  redirectPath: string;
  onGenerateSlug?: (title: string) => string;
}

export function BookForm({ defaultValues, onSubmit, isSubmitting = false, redirectPath, onGenerateSlug }: BookFormProps) {
  // Initialize form with default values
  const methods = useForm<BookFormValues>({
    // @ts-expect-error - The type mismatch is due to optional fields in the schema
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      // Required fields with non-null defaults
      title: defaultValues?.title ?? '',
      author: defaultValues?.author ?? '',
      slug: defaultValues?.slug ?? '',
      language: defaultValues?.language ?? 'tr',
      isPublished: defaultValues?.isPublished ?? false,
      isFeatured: defaultValues?.isFeatured ?? false,
      
      // Optional fields with explicit null defaults
      subtitle: defaultValues?.subtitle ?? null,
      description: defaultValues?.description ?? null,
      publisher: defaultValues?.publisher ?? null,
      publisherWebsite: defaultValues?.publisherWebsite ?? null,
      publishYear: defaultValues?.publishYear ?? null,
      isbn: defaultValues?.isbn ?? null,
      contributor: defaultValues?.contributor ?? null,
      translator: defaultValues?.translator ?? null,
      genre: defaultValues?.genre ?? null,
      series: defaultValues?.series ?? null,
      seriesIndex: defaultValues?.seriesIndex ?? null,
      tags: defaultValues?.tags ?? [],
      coverImageUrl: defaultValues?.coverImageUrl ?? null,
      epubUrl: defaultValues?.epubUrl ?? null
    } as BookFormValues,
    mode: "onTouched",
    criteriaMode: "firstError",
    shouldUnregister: true,
    reValidateMode: "onChange"
  });
  
  const { formState, getValues, handleSubmit, watch, setValue } = methods;
  const { errors } = formState;
  const _timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Watch for title changes to auto-generate slug
  const title = watch('title');
  
  useEffect(() => {
    if (onGenerateSlug && title) {
      const slug = onGenerateSlug(title);
      setValue('slug', slug, { shouldValidate: true });
    }
  }, [title, onGenerateSlug, setValue]);
  
  // Explicitly type the form submission handler
  const handleFormSubmitTyped = handleSubmit as unknown as (
    onValid: SubmitHandler<BookFormValues>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  
  // Debug form state in development - moved outside conditional
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const values = getValues();
      const requiredFields: Array<keyof BookFormValues> = ['title', 'author', 'publisher'];
      const registeredFields = methods.control._fields ? Object.keys(methods.control._fields) : [];
      
      // Check which required fields are filled
      const filledFields = requiredFields.reduce((acc, field) => {
        const value = values[field];
        return {
          ...acc,
          [field]: value ? value.toString().trim().length > 0 : false
        };
      }, {} as Record<keyof BookFormValues, boolean>);

      const allRequiredFilled = Object.values(filledFields).every(Boolean);
      const hasErrors = Object.keys(formState.errors || {}).length > 0;

      const validationState = {
        isDirty: formState.isDirty,
        isSubmitting: formState.isSubmitting,
        isValid: formState.isValid,
        errors: hasErrors ? formState.errors : "No errors",
        registeredFields,
        requiredFields: filledFields,
        allRequiredFilled,
        formValues: values,
        hasErrors
      };

      console.log('Form validation state:', validationState);

      console.group('Form Field States');
      registeredFields.forEach(field => {
        const fieldKey = field as keyof BookFormValues;
        const fieldState = methods.getFieldState(fieldKey);
        console.log(field, {
          value: values[fieldKey],
          isDirty: fieldState.isDirty,
          isTouched: fieldState.isTouched,
          error: fieldState.error,
          isFocused: document.activeElement === document.querySelector(`[name="${field}"]`)
        });
      });
      console.groupEnd();
    }
  }, [formState, getValues, methods.control._fields, methods.getFieldState, methods]);
  
  // Log form errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form errors:', errors);
    }
  }, [errors]);
  
  // Debug effect for form methods
  // Using useRef to store the previous form state
  const prevFormStateRef = useRef(formState);
  
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      const fields = methods.control._fields;
      const currentValues = getValues();
      
      // Log field changes for debugging
      Object.entries(fields).forEach(([field]) => {
        const fieldState = methods.getFieldState(field as keyof BookFormValues);
        console.log(`Field ${field}:`, {
          value: currentValues[field as keyof BookFormValues],
          error: fieldState.error,
          isDirty: fieldState.isDirty,
          isTouched: fieldState.isTouched,
        });
      });
      
      // Update the previous form state ref
      prevFormStateRef.current = formState;
    }
  }, [formState, methods.control._fields, methods.getFieldState, getValues, methods]);
  
  // Suppress unused variable warnings
  void useFormContext;
  void useFieldArray;
  void useWatch;
  void useRouter;
  void redirectPath;
  void _timeoutRef;

  const handleFormSubmit: SubmitHandler<BookFormValues> = async (formData) => {
    console.log('Form submission started with data:', formData);
    try {
      // Process tags - convert string to array and trim each tag
      let tagsArray: string[] = [];
      const tagsValue = formData.tags as unknown; // Type assertion to handle unknown type
      
      if (typeof tagsValue === 'string') {
        tagsArray = tagsValue
          .split(',')
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0);
      } else if (Array.isArray(tagsValue)) {
        tagsArray = tagsValue.filter((tag): tag is string => typeof tag === 'string');
      }

      // Create a properly typed submission data object
      const submissionData: BookFormValues = {
        // Required fields with type safety
        title: String(formData.title || '').trim(),
        author: String(formData.author || '').trim(),
        slug: String(formData.slug || '').trim(),
        language: String(formData.language || 'tr'),
        isPublished: Boolean(formData.isPublished),
        isFeatured: Boolean(formData.isFeatured),
        
        // Optional fields with proper null handling
        subtitle: formData.subtitle ? String(formData.subtitle).trim() : null,
        description: formData.description ? String(formData.description).trim() : null,
        publisher: formData.publisher ? String(formData.publisher).trim() : null,
        publisherWebsite: formData.publisherWebsite ? String(formData.publisherWebsite).trim() : null,
        publishYear: formData.publishYear ? Number(formData.publishYear) : null,
        isbn: formData.isbn ? String(formData.isbn).trim() : null,
        
        // Author and contributor information
        contributor: formData.contributor ? String(formData.contributor).trim() : null,
        translator: formData.translator ? String(formData.translator).trim() : null,
        illustrator: formData.illustrator ? String(formData.illustrator).trim() : null,
        
        // Book metadata
        genre: formData.genre || 'FICTION',
        series: formData.series || null,
        seriesIndex: formData.seriesIndex || null,
        tags: tagsArray,
        
        // Media
        coverImage: formData.coverImage || null,
        coverImageUrl: formData.coverImageUrl || null,
        epubUrl: formData.epubUrl || null,
      };
      
      console.log('Submitting book data:', submissionData);
      await onSubmit(submissionData);
      console.log('Book saved successfully');
      
    } catch (error) {
      console.error("Error saving book:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save book. Please try again.";
      toast.error(errorMessage);
      throw error; // Re-throw to let react-hook-form handle the error state
    }
  };

  const onSubmitForm = handleFormSubmitTyped(async (formData: BookFormValues) => {
    try {
      await handleFormSubmit(formData);
    } catch (error) {
      // Error is already handled in handleFormSubmit
      console.error('Form submission error:', error);
    }
  });

  return (
    <FormProvider {...methods}>
      <form 
        onSubmit={onSubmitForm}
        className="w-full"
        noValidate
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="main">Main Information</TabsTrigger>
                <TabsTrigger value="additional">Additional Information</TabsTrigger>
              </TabsList>
              
              <TabsContent value="main" className="space-y-6">
                <MainSection />
              </TabsContent>
              
              <TabsContent value="additional" className="space-y-6">
                <AdditionalSection />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="w-full md:w-1/3">
            <div className="space-y-6">
              <BookCoverSection />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}