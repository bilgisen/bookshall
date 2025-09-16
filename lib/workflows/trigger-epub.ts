// lib/workflows/trigger-epub.ts
import { db } from '@/db/drizzle';
import { workflowStatus } from '@/db';
import { eq } from 'drizzle-orm';

export interface PublishOptions {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
}

interface TriggerEpubWorkflowParams {
  bookId: string;
  options: Partial<PublishOptions>;
  metadata: Record<string, unknown>;
}

export async function triggerEpubWorkflow({
  bookId,
  options,
  metadata,
}: TriggerEpubWorkflowParams) {
  // Workflow ID oluştur
  const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date();

  // Başlangıç statüsünü DB'ye yaz
  await db.insert(workflowStatus).values({
    id: workflowId,
    bookId,
    workflowId,
    status: 'pending',
    progress: 0,
    metadata: { bookId, ...metadata },
    startedAt: now,
    updatedAt: now,
    createdAt: now,
    completedAt: null,
  });

  // Workflow'u asenkron tetikle
  processWorkflow(workflowId, bookId, 'epub', options, metadata).catch(console.error);

  return {
    workflowId,
    message: 'EPUB workflow started',
  };
}

// GitHub Actions workflow tetikleme
async function processWorkflow(
  workflowId: string,
  contentId: string,
  mode: string,
  options: Partial<PublishOptions>,
  metadata: Record<string, unknown>
) {
  try {
    const now = new Date();
    await db.update(workflowStatus)
      .set({ status: 'in-progress', progress: 10, updatedAt: now })
      .where(eq(workflowStatus.id, workflowId));

    const githubToken = (process.env.GH_PAT || process.env.GITHUB_TOKEN || '').trim();
    if (!githubToken) {
      throw new Error('GitHub token not configured (set GH_PAT or GITHUB_TOKEN)');
    }

    const repo = process.env.GITHUB_REPOSITORY?.trim() || 'bilgisen/bookshall';
    const workflowFileName = 'process-content.yml';
    const ref = process.env.GITHUB_REF?.trim() || 'main';

    // The workflow file name needs to be URL-encoded in the API path
    const encodedWorkflowFile = encodeURIComponent(workflowFileName);
    const apiUrl = `https://api.github.com/repos/${repo}/actions/workflows/${encodedWorkflowFile}/dispatches`;

    console.log(`Triggering workflow for content: ${contentId}`);
    console.log(`Repository: ${repo}, Workflow: ${workflowFileName}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref,
        inputs: {
          book_id: contentId,
          include_metadata: options.includeMetadata ? 'true' : 'false',
          include_cover: options.includeCover ? 'true' : 'false',
          include_toc: options.includeTOC ? 'true' : 'false',
          toc_level: options.tocLevel?.toString() || '3',
          metadata: JSON.stringify({ ...(metadata || {}), workflowId }),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: apiUrl,
        headers: Object.fromEntries(response.headers.entries()),
      });
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`✅ Successfully triggered workflow for content: ${contentId}`);

    await db.update(workflowStatus)
      .set({
        status: 'in-progress',
        progress: 50,
        workflowRunUrl: `https://github.com/${repo}/actions`,
        updatedAt: new Date(),
        metadata: {
          ...(metadata || {}),
          githubRunUrl: `https://github.com/${repo}/actions/runs/${workflowId}`,
        },
      })
      .where(eq(workflowStatus.id, workflowId));

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in processWorkflow for ${workflowId}:`, errorMessage);

    const now = new Date();
    await db.update(workflowStatus)
      .set({
        status: 'failed',
        progress: 0,
        error: errorMessage,
        updatedAt: now,
        completedAt: now,
        metadata: { ...(metadata || {}), error: errorMessage },
      })
      .where(eq(workflowStatus.id, workflowId));

    throw error;
  }
}
