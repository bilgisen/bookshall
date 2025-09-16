export type WorkflowStatusType = 'pending' | 'in-progress' | 'completed' | 'failed' | 'processing';

export interface WorkflowOptions {
  includeMetadata?: boolean;
  includeCover?: boolean;
  includeTOC?: boolean;
  tocLevel?: number;
  [key: string]: unknown;
}

export interface WorkflowResult {
  downloadUrl?: string;
  filePath?: string;
  fileSize?: number;
  [key: string]: unknown;
}

export interface WorkflowState {
  status: WorkflowStatusType;
  progress: number;
  result?: WorkflowResult;
  error?: string;
  workflowRunUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
