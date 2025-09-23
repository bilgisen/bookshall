// components/epub/epub-status-display.tsx
'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EpubProgressBar } from '@/components/epub/epub-progress-bar';

type PublishStatus = 'idle' | 'publishing' | 'generating' | 'completed' | 'failed';

interface EpubStatusDisplayProps {
  status: PublishStatus;
  progress: number;
  epubUrl: string | null;
  error: string | null;
  onDownload: () => void;
  onRetry: () => void;
  onReset: () => void;
}

export function EpubStatusDisplay({ 
  status, 
  progress, 
  epubUrl, 
  error,
  onDownload,
  onRetry,
  onReset
}: EpubStatusDisplayProps) {
  const loadingMessage = "This may take a few moments. Please don't close this page.";

  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mt-6"
    >
      {status === 'publishing' || status === 'generating' ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-primary">Generating your EPUB...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {loadingMessage}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <EpubProgressBar progress={progress} />
          </div>
        </div>
      ) : status === 'completed' && epubUrl ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-300">Your eBook is ready!</h3>
            <p className="text-muted-foreground mt-2">
              Your EPUB file has been generated successfully.
            </p>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={onDownload}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Download EPUB
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onReset}
                className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/20"
              >
                Generate New Version
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              This link will remain valid for 7 days
            </p>
          </div>
        </div>
      ) : status === 'failed' ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            
            <h3 className="text-xl font-semibold text-destructive">EPUB Generation Failed</h3>
            <p className="text-muted-foreground mt-2">
              {error || 'An error occurred while generating your EPUB'}
            </p>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={onRetry}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onReset}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Start Over
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              If the problem persists, please contact support
            </p>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}