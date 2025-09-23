// hooks/use-epub-generation.ts
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type PublishStatus = 'idle' | 'publishing' | 'generating' | 'completed' | 'failed';

interface PublishOptions {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
}

interface WorkflowStatusResponse {
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | string;
  epubUrl?: string;
  progress: number;
  message?: string;
  error?: string;
}

const POLLING_INTERVAL = 5000;

export function useEpubGeneration(bookId: string | undefined) {
  const queryClient = useQueryClient();
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const lastError = useRef<string | null>(null);

  // Workflow durumu sorgusu
  const queryResult = useQuery<WorkflowStatusResponse>({
    queryKey: ['epub-workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) throw new Error('No workflow ID');
      const res = await fetch(`/api/workflows/${workflowId}/status`);
      if (!res.ok) throw new Error('Failed to fetch workflow status');
      return res.json();
    },
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowStatusResponse | undefined;
      if (!data) return POLLING_INTERVAL;
      const normalizedStatus = data.status?.toLowerCase().replace(/-/g, '_');
      return normalizedStatus === 'completed' || normalizedStatus === 'failed'
        ? false
        : POLLING_INTERVAL;
    },
    retry: 1,
  });

  const workflowStatus = queryResult.data as WorkflowStatusResponse | undefined;
  const isStatusLoading = queryResult.isLoading;

  // EPUB generation başlat
  const startGeneration = useCallback(async (options: PublishOptions) => {
    if (!bookId) return;
    
    try {
      const response = await fetch(`/api/trigger-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, options }),
      });

      if (!response.ok) throw new Error('Failed to start EPUB generation');
      
      const { workflowId: newWorkflowId } = await response.json();
      setWorkflowId(newWorkflowId);
      
      // Cache temizle
      queryClient.invalidateQueries({ queryKey: ['epub-workflow', newWorkflowId] });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start generation';
      toast.error('EPUB generation failed', { description: errorMessage });
      throw err;
    }
  }, [bookId, queryClient]);

  // Durum yönetimi
  const getStatus = (): PublishStatus => {
    if (!workflowId) return 'idle';
    if (isStatusLoading) return 'publishing';
    
    const normalizedStatus = workflowStatus?.status?.toLowerCase().replace(/-/g, '_');
    
    if (normalizedStatus === 'completed') return 'completed';
    if (normalizedStatus === 'failed' || normalizedStatus === 'cancelled') return 'failed';
    if (normalizedStatus === 'in_progress' || normalizedStatus === 'queued') return 'generating';
    
    return 'idle';
  };

  const reset = useCallback(() => {
    setWorkflowId(null);
    queryClient.removeQueries({ queryKey: ['epub-workflow'] });
  }, [queryClient]);

  // Hata mesajı
  const error = workflowStatus?.error || null;
  
  // Aynı hatayı tekrar göstermemek için
  if (error && lastError.current !== error) {
    lastError.current = error;
    toast.error('EPUB generation failed', { description: error });
  }

  return {
    status: getStatus(),
    progress: workflowStatus?.progress || 0,
    epubUrl: workflowStatus?.epubUrl || null,
    error,
    startGeneration,
    reset,
    isLoading: getStatus() === 'publishing' || getStatus() === 'generating',
  };
}