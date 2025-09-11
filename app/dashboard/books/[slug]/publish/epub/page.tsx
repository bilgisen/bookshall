// app/dashboard/books/[slug]/publish/epub/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  
  // State management
  const [status, setStatus] = useState<PublishStatus>('idle');
  const [isLoading, setIsLoading] = useState(true); // Start with loading true for auth check
  const [error, setError] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [epubUrl, setEpubUrl] = useState<string | null>(null);
  
  // Publish options
  const [options, setOptions] = useState<PublishOptions>({
    includeMetadata: true,
    includeCover: true,
    includeTOC: true,
    tocLevel: 3,
    includeImprint: true
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: authSession } = await authClient.getSession();
        if (!authSession?.user) {
          toast.error('Please sign in to generate an EPUB');
          router.push(`/sign-in?redirect=/dashboard/books/${slug}/publish/epub`);
          return;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Failed to verify authentication');
        toast.error('Authentication check failed');
      }
    };

    checkAuth();
  }, [router, slug]);

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
        const { data: authSession } = await authClient.getSession();
        if (!authSession?.session?.id) {
          throw new Error('No active session found');
        }
        
        const response = await fetch(`/api/workflows/${workflowId}/status`, {
          headers: {
            'Authorization': `Bearer ${authSession.session.id}`,
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) throw new Error('Failed to check status');

        const data: WorkflowStatus = await response.json();
        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          setStatus('completed');
          setEpubUrl(data.epubUrl || null);
          toast.success('EPUB generated successfully!');
          polling = false;
        } else if (data.status === 'failed') {
          setStatus('failed');
          setError(data.error || 'EPUB generation failed');
          toast.error('Failed to generate EPUB');
          polling = false;
        } else {
          // Continue polling
          pollingAttempts++;
          setTimeout(pollStatus, POLLING_INTERVAL);
        }
      } catch (error) {
        console.error('Polling error:', error);
        pollingAttempts++;
        if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
          setTimeout(pollStatus, POLLING_INTERVAL);
        } else {
          setStatus('failed');
          setError('Failed to check generation status');
          toast.error('Failed to check EPUB generation status');
        }
      }
    };

    pollStatus();
    return () => { polling = false; };
  }, [workflowId, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Verify session is still valid
      const { data: authSession } = await authClient.getSession();
      if (!authSession?.user) {
        toast.error('Session expired. Please sign in again.');
        router.push(`/sign-in?redirect=/dashboard/books/${slug}/publish/epub`);
        return;
      }

      if (!authSession.session?.id) {
        throw new Error('No active session found');
      }

      setStatus('publishing');
      setError(null);
      setIsLoading(true);
      
      const response = await fetch(`/api/books/by-slug/${slug}/publish/epub`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.session.id}`
        },
        body: JSON.stringify({ options })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to start EPUB generation');
      }

      const { workflowId: newWorkflowId } = await response.json();
      setWorkflowId(newWorkflowId);
      setStatus('generating');
      toast.info('EPUB generation started. This may take a few minutes...');
      
    } catch (error) {
      console.error('Publish error:', error);
      setStatus('failed');
      setError(error instanceof Error ? error.message : 'Failed to publish EPUB');
      toast.error('Failed to start EPUB generation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = <K extends keyof PublishOptions>(
    key: K,
    value: PublishOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Generate EPUB</CardTitle>
            <CardDescription>
              Configure the EPUB generation options below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Publishing Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeMetadata" 
                    checked={options.includeMetadata}
                    onCheckedChange={(checked) => handleOptionChange('includeMetadata', checked)}
                    disabled={status === 'publishing' || status === 'generating'}
                  />
                  <Label htmlFor="includeMetadata">Include Metadata</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeCover" 
                    checked={options.includeCover}
                    onCheckedChange={(checked) => handleOptionChange('includeCover', checked)}
                    disabled={status === 'publishing' || status === 'generating'}
                  />
                  <Label htmlFor="includeCover">Include Cover</Label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeTOC" 
                      checked={options.includeTOC}
                      onCheckedChange={(checked) => handleOptionChange('includeTOC', checked)}
                      disabled={status === 'publishing' || status === 'generating'}
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
                        disabled={status === 'publishing' || status === 'generating'}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeImprint" 
                    checked={options.includeImprint}
                    onCheckedChange={(checked) => handleOptionChange('includeImprint', checked)}
                    disabled={status === 'publishing' || status === 'generating'}
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
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      {Math.round(progress)}% complete
                    </p>
                  </div>
                )}

                {status === 'completed' && (
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>EPUB generated successfully!</span>
                    </div>
                    <Button 
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}

                {status === 'failed' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-2">
                      <AlertCircle className="h-5 w-5" />
                      <span>Failed to generate EPUB</span>
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {error}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/books/${slug}`)}
                    disabled={status === 'publishing' || status === 'generating'}
                  >
                    Back to Book
                  </Button>

                  {status === 'failed' ? (
                    <Button 
                      type="button"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={status === 'publishing' || status === 'generating'}
                    >
                      {status === 'idle' ? 'Generate EPUB' : 'Generating...'}
                      {(status === 'publishing' || status === 'generating') && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}