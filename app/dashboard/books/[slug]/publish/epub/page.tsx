'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { BookHeader } from '@/components/books/book-header';
import { SingleBookView } from '@/components/books/single-book-view';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Loader2, CheckCircle2, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// Types
type PublishStatus = 'idle' | 'publishing' | 'generating' | 'completed' | 'failed';

interface PublishOptions {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
}

interface WorkflowStatus {
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  epubUrl?: string;
  progress: number;
  message?: string;
  error?: string;
}

// Constants
const POLLING_INTERVAL = 5000; // 5 seconds
const MAX_POLLING_ATTEMPTS = 60; // 5 minutes max

export default function GenerateEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: session } = authClient.useSession();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<PublishStatus>('idle');
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [epubUrl, setEpubUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch book data
  const { data: book, isLoading: isLoadingBook } = useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const response = await fetch(`/api/books/by-slug/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch book');
      return response.json();
    },
    enabled: !!slug && !!session?.user,
  });
  
  // Publish options
  const [options, setOptions] = useState<PublishOptions>({
    includeMetadata: true,
    includeCover: true,
    includeTOC: true,
    tocLevel: 6, // Keeping this in state for backward compatibility but not using it
  });

  // Check for existing EPUB data on mount
  useEffect(() => {
    if (!book?.id) return;
    
    // Check for any stored EPUB data for this book
    const storedData = Object.entries(localStorage)
      .filter(([key]) => key.startsWith('epub_'))
      .map((entry) => {  // Using array destructuring with unused variable
        try {
          return JSON.parse(entry[1]);
        } catch {
          return null;
        }
      })
      .find(data => data?.bookId === book.id);
    
    if (storedData?.epubUrl) {
      setEpubUrl(storedData.epubUrl);
      setStatus('completed');
      setProgress(100);
    }
    
    // Clean up old entries (older than 7 days)
    const now = new Date();
    Object.entries(localStorage)
      .filter(([key]) => key.startsWith('epub_'))
      .forEach(([key, value]) => {
        try {
          const data = JSON.parse(value);
          const entryDate = new Date(data.timestamp);
          const daysOld = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysOld > 7) {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid JSON, remove the key
          localStorage.removeItem(key);
        }
      });
  }, [book?.id]);

  // Poll workflow status with retry logic
  useEffect(() => {
    if (!workflowId || status !== 'generating') return;

    let isMounted = true;
    let pollingAttempts = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    let timeoutId: NodeJS.Timeout;
    
    const pollStatus = async () => {
      if (!isMounted) return;

      if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
        if (isMounted) {
          setStatus('failed');
          setError('EPUB generation timed out');
          toast.error('EPUB generation took too long. Please try again.');
        }
        return;
      }

      try {
        const response = await fetch(`/api/workflows/${workflowId}/status`);
        if (!response.ok) throw new Error('Failed to check status');
        
        const data: WorkflowStatus = await response.json();
        
        if (isMounted) {
          setProgress(data.progress);

          if (data.status === 'completed') {
            // Update state first
            setStatus('completed');
            setEpubUrl(data.epubUrl || null);
            
            // Store in localStorage for persistence
            if (data.epubUrl) {
              const storedData = {
                epubUrl: data.epubUrl,
                bookId: book?.id,
                timestamp: new Date().toISOString()
              };
              localStorage.setItem(`epub_${workflowId}`, JSON.stringify(storedData));
            }
            
            // Show success message
            toast.success('EPUB generated successfully!', {
              id: 'epub-generated',
              duration: 10000
            });
            
            // Clear any existing polling
            return;
          } else if (data.status === 'failed') {
            setStatus('failed');
            setError(data.error || 'EPUB generation failed');
            toast.error('Failed to generate EPUB', {
              id: 'epub-error'
            });
            return;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        consecutiveErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          if (isMounted) {
            setStatus('failed');
            setError('Connection to the server was lost');
            toast.error('Failed to check EPUB generation status', {
              id: 'epub-status-error',
              action: {
                label: 'Retry',
                onClick: handleRetry
              }
            });
          }
          return;
        }
        
        // Log the error but continue polling
        console.warn(`Error ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}:`, err);
      }

      // Continue polling if still in progress
      if (isMounted && status === 'generating') {
        pollingAttempts++;
        timeoutId = setTimeout(pollStatus, POLLING_INTERVAL);
      }
    };

    // Initial poll
    pollStatus();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [workflowId, status, book?.id]);

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
    setIsLoading(true);
    setStatus('publishing');
    
    try {
      const response = await fetch(`/api/trigger-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: book.id,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start EPUB generation');
      }

      const { workflowId: newWorkflowId } = await response.json();
      setWorkflowId(newWorkflowId);
      setStatus('generating');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('failed');
      toast.error('Failed to start EPUB generation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (epubUrl) {
      window.open(epubUrl, '_blank');
    }
  };

  const handleRetry = useCallback(async () => {
    if (!workflowId) {
      // If no workflow ID, reset to initial state
      setStatus('idle');
      setError(null);
      return;
    }

    // If we have a workflow ID, retry the same workflow
    setStatus('publishing');
    setError(null);
    
    try {
      // Check if the workflow is still valid
      const response = await fetch(`/api/workflows/${workflowId}/status`);
      if (!response.ok) {
        throw new Error('Failed to check workflow status');
      }
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        setStatus('completed');
        setEpubUrl(data.epubUrl || null);
        setProgress(100);
        toast.success('EPUB generation completed on retry', {
          id: 'epub-retry-success'
        });
      } else if (data.status === 'in_progress' || data.status === 'queued') {
        setStatus('generating');
        toast.info('Resuming EPUB generation', {
          id: 'epub-resume'
        });
      } else {
        // If the workflow is in a terminal state, reset to allow a new generation
        setStatus('idle');
      }
    } catch (err) {
      console.error('Retry failed:', err);
      setStatus('failed');
      setError('Failed to retry EPUB generation');
      
      // Create a new function for the retry action to avoid circular dependency
      const retryAction = () => {
        handleRetry().catch(console.error);
      };
      
      toast.error('Failed to retry EPUB generation', {
        id: 'epub-retry-error',
        action: {
          label: 'Try Again',
          onClick: retryAction
        }
      });
    }
  }, [workflowId]);

  if (isLoadingBook || !session) {
    return (
      <div className="container mx-auto p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 mt-8 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto p-8">
        <p>Book not found</p>
      </div>
    );
  }

  return (
    <div className="container w-full p-8 space-y-8">
      <div className="w-full">
        <BookHeader 
          title="Generate EPUB"
          description="Configure and generate an EPUB version of your book"
          slug={slug as string}
          showEditButton={false}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <Card className="bg-card/30">
            <CardHeader>
              <CardTitle>EPUB Generation Settings</CardTitle>
              <CardDescription>
                Customize how your EPUB will be generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeMetadata" 
                      checked={options.includeMetadata}
                      onCheckedChange={(checked) => handleOptionChange('includeMetadata', checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="includeMetadata">Include Imprint</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeCover" 
                      checked={options.includeCover}
                      onCheckedChange={(checked) => handleOptionChange('includeCover', checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="includeCover">Include Cover</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeTOC" 
                      checked={options.includeTOC}
                      onCheckedChange={(checked) => handleOptionChange('includeTOC', checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="includeTOC">Include Table of Contents</Label>
                  </div>

                  
                </div>

                {/* Status and Actions */}
                <div className="space-y-4 pt-4">
                  {(status === 'publishing' || status === 'generating') && (
                    <div className="space-y-4 rounded-lg border border-primary/50 bg-primary/20 p-4">
                      <div className="flex items-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/80" />
                        <div className="flex-1">
                          <p className="font-medium text-primary">
                            {status === 'publishing' ? 'Starting EPUB generation...' : 'Generating your EPUB...'}
                          </p>
                          <p className="text-sm text-primary/80">
                            This may take a few moments. Please don&apos;t close this page.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-blue-700">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-300 ease-out" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'completed' && epubUrl && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
                      <div className="flex flex-col items-center text-center">
                        <div className="rounded-full bg-green-100 p-3">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="mt-3 text-lg font-medium text-green-800">
                          Your eBook is ready!
                        </h3>
                        <p className="mt-1 text-sm text-green-600">
                          Your EPUB file has been generated successfully.
                        </p>
                        <div className="mt-4 flex w-full flex-col space-y-3 sm:flex-row sm:justify-center sm:space-x-3 sm:space-y-0">
                          <Button
                            onClick={handleDownload}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download EPUB
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(epubUrl);
                              toast.success('Download link copied to clipboard');
                            }}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            Copy Download Link
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-green-500">
                          This link will remain valid for 7 days
                        </p>
                      </div>
                    </div>
                  )}

                  {status === 'failed' && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="rounded-full bg-red-100 p-3">
                          <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="mt-3 text-lg font-medium text-red-800">
                          EPUB Generation Failed
                        </h3>
                        <p className="mt-1 text-sm text-red-600">
                          {error || 'An error occurred while generating your EPUB'}
                        </p>
                        <div className="mt-4 flex w-full flex-col space-y-3 sm:flex-row sm:justify-center sm:space-x-3 sm:space-y-0">
                          <Button
                            onClick={handleRetry}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setStatus('idle');
                              setError(null);
                            }}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Start Over
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-red-500">
                          If the problem persists, please contact support
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {status === 'completed' ? (
                      <Button
                        type="button"
                        onClick={handleDownload}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Your EPUB
                      </Button>
                    ) : status === 'failed' ? (
                      <Button
                        type="button"
                        onClick={handleRetry}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                    ) : (
                      <Button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : 'Generate EPUB'}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="sticky top-24">
            <SingleBookView 
              book={{
                id: book.id,
                title: book.title,
                author: book.author || null,
                coverImageUrl: book.coverImageUrl || null,
                slug: book.slug,
                description: book.description || undefined,
                publisher: book.publisher || null,
              }} 
            />
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">EPUB Tips</h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• EPUB works on most e-readers and mobile devices</li>
                <li>• Include a cover image for better presentation</li>
                <li>• Table of contents improves navigation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
