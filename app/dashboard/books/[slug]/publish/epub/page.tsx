'use client';

import { useState, useEffect } from 'react';
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
  includeImprint: boolean;
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
    tocLevel: 3,
    includeImprint: true
  });

  // Poll workflow status
  useEffect(() => {
    if (!workflowId || status !== 'generating') return;

    let polling = true;
    let pollingAttempts = 0;

    const pollStatus = async () => {
      if (!polling || pollingAttempts >= MAX_POLLING_ATTEMPTS) {
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
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
        setProgress(data.progress);

        if (data.status === 'completed') {
          setStatus('completed');
          setEpubUrl(data.epubUrl || null);
          toast.success('EPUB generated successfully!');
          polling = false;
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error || 'EPUB generation failed');
          toast.error('Failed to generate EPUB');
        }
      } catch (err) {
        setStatus('failed');
        setError('Failed to check generation status');
        console.error('Polling error:', err);
      } finally {
        pollingAttempts++;
        if (polling && status === 'generating') {
          setTimeout(pollStatus, POLLING_INTERVAL);
        }
      }
    };

    pollStatus();
    return () => { polling = false; };
  }, [workflowId, status]);

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

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
  };

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
                    <Label htmlFor="includeMetadata">Include Metadata</Label>
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

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="includeTOC" 
                        checked={options.includeTOC}
                        onCheckedChange={(checked) => handleOptionChange('includeTOC', checked === true)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="includeTOC">Include Table of Contents</Label>
                    </div>
                    
                    {options.includeTOC && (
                      <div className="pl-6 space-y-2">
                        <Label htmlFor="tocLevel">TOC Level: {options.tocLevel}</Label>
                        <Slider
                          id="tocLevel"
                          min={1}
                          max={5}
                          step={1}
                          value={[options.tocLevel]}
                          onValueChange={([value]) => handleOptionChange('tocLevel', value)}
                          className="w-full max-w-md"
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeImprint" 
                      checked={options.includeImprint}
                      onCheckedChange={(checked) => handleOptionChange('includeImprint', checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="includeImprint">Include Imprint Page</Label>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="space-y-4 pt-4">
                  {(status === 'publishing' || status === 'generating') && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>
                          {status === 'publishing' ? 'Starting generation...' : 'Generating your EPUB...'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-right">
                        {Math.round(progress)}% complete
                      </p>
                    </div>
                  )}

                  {status === 'completed' && epubUrl && (
                    <div className="rounded-md bg-green-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">
                            EPUB generated successfully!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'failed' && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800">
                            {error || 'Failed to generate EPUB'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {status === 'completed' ? (
                      <Button
                        type="button"
                        onClick={handleDownload}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download EPUB
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
