-- Add workflow_status table
CREATE TABLE IF NOT EXISTS "workflow_status" (
  "id" text PRIMARY KEY NOT NULL,
  "bookId" text NOT NULL,
  "workflowId" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "progress" integer DEFAULT 0,
  "error" text,
  "result" jsonb,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "workflow_status_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "workflow_status_workflowId_idx" ON "workflow_status" ("workflowId");
CREATE INDEX IF NOT EXISTS "workflow_status_bookId_idx" ON "workflow_status" ("bookId");
CREATE INDEX IF NOT EXISTS "workflow_status_status_idx" ON "workflow_status" ("status");
