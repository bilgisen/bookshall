import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { workflowStatus } from '@/db';
import { eq } from 'drizzle-orm';

type WorkflowResult = {
  downloadUrl?: string;
  [key: string]: unknown;
};

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
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

    const { workflowId } = params;

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

    return NextResponse.json({
      status: workflow.status,
      progress: workflow.progress,
      downloadUrl,
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
