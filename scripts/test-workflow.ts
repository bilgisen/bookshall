import { db } from '../db/drizzle';
import { workflowStatus } from '../db';
import { eq } from 'drizzle-orm';
import { 
  triggerEpubWorkflow, 
  getWorkflowStatus, 
  updateWorkflowStatus, 
  type PublishOptions 
} from '../lib/workflows';

async function testWorkflow() {
  try {
    // Test data
    const testBookId = 'test-book-123';
    const testUserId = 'test-user-123';
    const testSessionId = 'test-session-123';
    const testContentId = 'test-content-123';

    const options: PublishOptions = {
      includeMetadata: true,
      includeCover: true,
      includeTOC: true,
      tocLevel: 2,
      includeImprint: true,
    };

    const metadata = {
      sessionId: testSessionId,
      userId: testUserId,
      contentId: testContentId,
      bookTitle: 'Test Book',
      additionalInfo: 'This is a test workflow',
    };

    console.log('Starting workflow test...');

    // 1. Trigger a new workflow
    console.log('\n1. Triggering new workflow...');
    const triggerResult = await triggerEpubWorkflow({
      bookId: testBookId,
      options,
      metadata,
    });

    console.log('Workflow triggered:', {
      success: triggerResult.success,
      workflowId: triggerResult.workflowId,
      status: triggerResult.status,
    });

    const workflowId = triggerResult.workflowId;

    // 2. Get workflow status
    console.log('\n2. Getting workflow status...');
    const status = await getWorkflowStatus(workflowId);
    console.log('Current status:', {
      id: status?.id,
      status: status?.status,
      progress: status?.progress,
    });

    // 3. Update workflow status
    console.log('\n3. Updating workflow status to in-progress...');
    await updateWorkflowStatus(workflowId, {
      status: 'in-progress',
      progress: 50,
      metadata: {
        step: 'Generating EPUB',
        progressDetails: 'Processing chapters...',
      },
    });

    const updatedStatus = await getWorkflowStatus(workflowId);
    console.log('Updated status:', {
      status: updatedStatus?.status,
      progress: updatedStatus?.progress,
      metadata: updatedStatus?.metadata,
    });

    // 4. Complete the workflow
    console.log('\n4. Completing workflow...');
    await updateWorkflowStatus(workflowId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      result: {
        fileUrl: 'https://example.com/test-book.epub',
        fileSize: 123456,
        pages: 42,
      },
    });

    const finalStatus = await getWorkflowStatus(workflowId);
    console.log('Final status:', {
      status: finalStatus?.status,
      progress: finalStatus?.progress,
      completedAt: finalStatus?.completedAt,
      result: finalStatus?.result,
    });

    console.log('\nWorkflow test completed successfully!');
  } catch (error) {
    console.error('Error in workflow test:', error);
    process.exit(1);
  } finally {
    // Clean up test data
    await db.delete(workflowStatus).where(eq(workflowStatus.id, 'test-book-123'));
    await db.end();
    process.exit(0);
  }
}

testWorkflow();
