'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// auth is imported from @/lib/auth but not used directly
import { useParams } from 'next/navigation';
import { Slider } from '@/components/ui/slider';

interface PublishOptions {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
  includeImprint: boolean;
}

type PublishStatus = 'idle' | 'publishing' | 'completed' | 'failed';

export default function EbookPublishPage() {
  const router = useRouter();
  const { id: bookId } = useParams() as { id: string };
  const [session, setSession] = useState<{
    user: { id: string; email?: string; name?: string };
    accessToken: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PublishStatus>('idle');
  
  const [options, setOptions] = useState<PublishOptions>({
    includeMetadata: true,
    includeCover: true,
    includeTOC: true,
    tocLevel: 3,
    includeImprint: true,
  });

  // Check authentication and get session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get session using the auth API
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        
        const session = await response.json();
        
        if (!session?.user) {
          router.push(`/signin?redirect=/dashboard/books/${bookId}/publish/ebook`);
          return;
        }
        
        setSession({
          user: session.user,
          accessToken: session.accessToken || ''
        });
      } catch (error) {
        console.error('Authentication error:', error);
        toast.error('Authentication failed. Please sign in again.');
        router.push('/signin');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [bookId, router]);

  const handleOptionChange = (key: keyof PublishOptions, value: boolean | number | 'indeterminate') => {
    // Convert 'indeterminate' to false for boolean options
    const normalizedValue = value === 'indeterminate' ? false : value;
    setOptions(prev => ({
      ...prev,
      [key]: normalizedValue
    }));
  };

  const handlePublish = async () => {
    if (!session) return;
    
    setStatus('publishing');
    setWorkflowId(null);
    setDownloadUrl(null);
    
    try {
      const response = await fetch('/api/trigger-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          bookId,
          options,
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start publishing process');
      }

      setWorkflowId(data.workflowId);
      await checkStatus(data.workflowId);
      
    } catch (error) {
      console.error('Publishing failed:', error);
      handleError(error);
    }
  };

  const checkStatus = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.status === 'completed') {
        setStatus('completed');
        setProgress(100);
        if (data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
        }
      } else if (data.status === 'failed') {
        setStatus('failed');
        setError(data.error || 'Publishing failed');
      } else {
        setProgress(data.progress || 0);
        // Continue polling
        setTimeout(() => checkStatus(workflowId), 2000);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      handleError(error);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setError(errorMessage);
    setStatus('failed');
    toast.error(`Publishing failed: ${errorMessage}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <h1 className="text-3xl font-bold mb-6">Publish Ebook</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Publishing Options</CardTitle>
          <CardDescription>
            Configure how your ebook will be generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-metadata" 
                checked={options.includeMetadata}
                onCheckedChange={(checked) => handleOptionChange('includeMetadata', checked)}
              />
              <Label htmlFor="include-metadata">Include book metadata</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-cover" 
                checked={options.includeCover}
                onCheckedChange={(checked) => handleOptionChange('includeCover', checked)}
              />
              <Label htmlFor="include-cover">Include cover image</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-toc" 
                checked={options.includeTOC}
                onCheckedChange={(checked) => handleOptionChange('includeTOC', checked)}
              />
              <Label htmlFor="include-toc">Include table of contents</Label>
            </div>

            {options.includeTOC && (
              <div className="pl-8 space-y-2">
                <Label htmlFor="toc-level">TOC Depth: {options.tocLevel}</Label>
                <Slider
                  id="toc-level"
                  min={1}
                  max={6}
                  step={1}
                  value={[options.tocLevel]}
                  onValueChange={(value) => handleOptionChange('tocLevel', value[0])}
                  className="w-full max-w-md"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-imprint" 
                checked={options.includeImprint}
                onCheckedChange={(checked) => handleOptionChange('includeImprint', checked)}
              />
              <Label htmlFor="include-imprint">Include imprint page</Label>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handlePublish}
              disabled={status === 'publishing'}
              className="w-full sm:w-auto"
            >
              {status === 'publishing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : status === 'completed' ? (
                'Published Successfully'
              ) : (
                'Publish Ebook'
              )}
            </Button>

            {status === 'completed' && downloadUrl && (
              <Button 
                variant="outline" 
                className="ml-4"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Ebook
              </Button>
            )}

            {status === 'failed' && (
              <div className="mt-4 text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Failed to publish. Please try again.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {workflowId && (
        <div className="text-sm text-muted-foreground">
          Workflow ID: <code className="bg-muted px-2 py-1 rounded">{workflowId}</code>
        </div>
      )}
    </div>
  );
}
