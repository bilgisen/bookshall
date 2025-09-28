// components/epub/epub-generator.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { EpubOptionsForm } from '@/components/epub/epub-options-form';
import { EpubStatusDisplay } from '@/components/epub/epub-status-display';
import { EpubSidebar } from '@/components/epub/epub-sidebar';
import { useEpubGeneration } from '@/hooks/use-epub-generation';
import { useBookBySlug } from '@/hooks/use-book-by-slug';
import { authClient } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

interface PublishOptions {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
}

export function EpubGenerator() {
  const { slug } = useParams<{ slug: string }>();
  const { data: sessionData } = authClient.useSession();
  const { book, isLoading: isBookLoading } = useBookBySlug(slug, !!sessionData?.user);
  
  const {
    status,
    progress,
    epubUrl,
    error,
    startGeneration,
    reset,
    isLoading,
  } = useEpubGeneration(book?.id);

  const [options, setOptions] = useState<PublishOptions>({
    includeMetadata: true,  // Set to true to have 'Include Imprint' checked by default
    includeCover: false,
    includeTOC: false,
    tocLevel: 2,
  });

  const handleOptionChange = <K extends keyof PublishOptions>(
    key: K,
    value: PublishOptions[K]
  ) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;
    await startGeneration(options);
  };

  const handleDownload = () => {
    if (epubUrl) {
      window.open(epubUrl, '_blank');
    }
  };

  const handleRetry = async () => {
    if (!book) return;
    await startGeneration(options);
  };

  if (isBookLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading book data...</span>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Book not found</h2>
            <p className="text-muted-foreground mt-2">The requested book could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="container w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
      </motion.div>

      <motion.div
        className="flex flex-col lg:flex-row gap-8 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="flex-1">
          <EpubOptionsForm
            options={options}
            onOptionChange={handleOptionChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
          
          <EpubStatusDisplay
            status={status}
            progress={progress}
            epubUrl={epubUrl}
            error={error}
            onDownload={handleDownload}
            onRetry={handleRetry}
            onReset={reset}
          />
        </div>
        
        <EpubSidebar book={book} />
      </motion.div>
    </motion.div>
  );
}