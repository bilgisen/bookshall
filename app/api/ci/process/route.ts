import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { WorkflowOptions, WorkflowState } from '@/types/workflow';

type ProcessRequest = {
  contentId: string;
  mode: string;
  options: WorkflowOptions;
  metadata?: Record<string, unknown>;
};

// In-memory store for workflow status (replace with Redis in production)
const workflowStatus = new Map<string, WorkflowState>();

// Clean up old workflows periodically
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  for (const [id, workflow] of workflowStatus.entries()) {
    if (workflow.updatedAt < oneHourAgo) {
      workflowStatus.delete(id);
    }
  }
}, 60 * 60 * 1000); // Run every hour

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as ProcessRequest;
    const { contentId, mode, options, metadata = {} } = body;

    if (!contentId || !mode) {
      return NextResponse.json(
        { error: 'contentId and mode are required' },
        { status: 400 }
      );
    }

    // Generate a unique workflow ID
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Store initial workflow status
    workflowStatus.set(workflowId, {
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Start processing in the background
    processWorkflow(workflowId, contentId, mode, options, metadata);

    return NextResponse.json({
      workflowId,
      status: 'pending',
      message: 'Workflow started',
    });

  } catch (error) {
    console.error('Error in CI process:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return NextResponse.json(
      { error: 'workflowId is required' },
      { status: 400 }
    );
  }

  const workflow = workflowStatus.get(workflowId);
  
  if (!workflow) {
    return NextResponse.json(
      { error: 'Workflow not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    workflowId,
    status: workflow.status,
    progress: workflow.progress,
    result: workflow.result,
    error: workflow.error,
    updatedAt: workflow.updatedAt,
  });
}
// Simulate workflow processing (replace with actual implementation)
async function processWorkflow(
  workflowId: string,
  contentId: string,
  mode: string,
  options: WorkflowOptions,
  metadata: Record<string, unknown>
) {
  const updateStatus = (updates: Partial<WorkflowState>) => {
    const current = workflowStatus.get(workflowId);
    if (current) {
      workflowStatus.set(workflowId, {
        ...current,
        ...updates,
        updatedAt: new Date(),
      });
    }
  };

  try {
    // Initialize workflow
    workflowStatus.set(workflowId, {
      status: 'processing',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Simulate processing steps
    const steps = [
      { name: 'Initializing', duration: 1000 },
      { name: 'Processing content', duration: 3000 },
      { name: 'Generating output', duration: 2000 },
      { name: 'Finalizing', duration: 1000 },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = Math.round(((i + 1) / steps.length) * 100);
      
      updateStatus({
        status: 'processing',
        progress,
      });

      console.log(`[${workflowId}] ${step.name} (${progress}%)`);
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    // Complete the workflow
    updateStatus({
      status: 'completed',
      progress: 100,
      result: {
        downloadUrl: `/api/downloads/${contentId}/book.epub`,
        filePath: `/downloads/${contentId}/book.epub`,
      },
    });
  } catch (error) {
    console.error(`Workflow ${workflowId} failed:`, error);
    updateStatus({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
