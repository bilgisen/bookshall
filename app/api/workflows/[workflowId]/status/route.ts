import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { workflowStatus } from '@/db/schema';
import { eq } from 'drizzle-orm';

type WorkflowResult = {
  downloadUrl?: string;
  [key: string]: unknown;
};

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  // Await the params promise
  const { workflowId } = await params;
  
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

    // workflowId is already destructured from params above

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }

    // Get workflow status from database
    const workflow = await db.query.workflowStatus.findFirst({
      where: eq(workflowStatus.workflowId, workflowId)
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // If the workflow is completed, check if there's a result with download URL
    let downloadUrl = null;
    const result = workflow.result as WorkflowResult | null;
    if (workflow.status === 'completed' && result?.downloadUrl) {
      downloadUrl = result.downloadUrl;
    }

    // Map DB status to frontend expected values
    const statusMap: Record<string, 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled'> = {
      pending: 'queued',
      'in-progress': 'in_progress',
      completed: 'completed',
      failed: 'failed',
    } as const;

    const mappedStatus = statusMap[workflow.status as keyof typeof statusMap] || 'queued';

    const resultTyped: WorkflowResult | null = (workflow.result as WorkflowResult | null) ?? null;
    return NextResponse.json({
      status: mappedStatus,
      progress: workflow.progress,
      epubUrl: downloadUrl || resultTyped?.downloadUrl || undefined,
      error: workflow.error,
      updatedAt: workflow.updatedAt.toISOString(),
    });

  } catch (error) {
    console.error('Error checking workflow status:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
