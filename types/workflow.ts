export type WorkflowStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WorkflowOptions {
  includeMetadata?: boolean;
  includeCover?: boolean;
  includeTOC?: boolean;
  tocLevel?: number;
  includeImprint?: boolean;
  [key: string]: unknown;
}

export interface WorkflowResult {
  downloadUrl?: string;
  filePath?: string;
  fileSize?: number;
  [key: string]: unknown;
}

export interface WorkflowState {
  status: WorkflowStatus;
  progress: number;
  result?: WorkflowResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
