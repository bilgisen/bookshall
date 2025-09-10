// app/api/ci/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { workflowStatus } from '@/db';
import { eq } from 'drizzle-orm';
import { triggerEpubWorkflow, PublishOptions } from '@/lib/workflows/trigger-epub';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { contentId, mode, options, metadata } = await request.json();
    
    if (!contentId || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only support epub mode for now
    if (mode !== 'epub') {
      return NextResponse.json(
        { error: 'Unsupported workflow mode' },
        { status: 400 }
      );
    }

    // Trigger the workflow
    const result = await triggerEpubWorkflow({
      bookId: contentId,
      options: options as Partial<PublishOptions> || {},
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      workflowId: result.workflowId,
      status: 'pending',
      message: result.message,
    });
  } catch (error) {
    console.error('Error processing workflow:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId');
  
  if (!workflowId) {
    return NextResponse.json(
      { error: 'Missing workflowId parameter' },
      { status: 400 }
    );
  }

  try {
    const workflow = await db
      .select()
      .from(workflowStatus)
      .where(eq(workflowStatus.id, workflowId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: workflow.id,
      workflowId: workflow.workflowId,
      status: workflow.status,
      progress: workflow.progress,
      error: workflow.error,
      result: workflow.result,
      workflowRunUrl: workflow.workflowRunUrl,
      metadata: workflow.metadata,
      startedAt: workflow.startedAt?.toISOString(),
      updatedAt: workflow.updatedAt?.toISOString(),
      completedAt: workflow.completedAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching workflow status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow status' },
      { status: 500 }
    );
  }
}
