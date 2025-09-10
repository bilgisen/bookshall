-- Add new columns to workflow_status table
ALTER TABLE workflow_status
ADD COLUMN IF NOT EXISTS workflow_run_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update existing rows with default values
UPDATE workflow_status 
SET 
  metadata = COALESCE(metadata, '{}'::jsonb),
  status = COALESCE(status, 'pending'),
  progress = COALESCE(progress, 0),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE 
  metadata IS NULL 
  OR status IS NULL 
  OR progress IS NULL 
  OR created_at IS NULL 
  OR updated_at IS NULL;

-- Add constraints
ALTER TABLE workflow_status 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN progress SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL,
ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
ALTER COLUMN metadata SET NOT NULL;

-- Add index on workflow_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_status_workflow_id ON workflow_status(workflow_id);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_workflow_status_status ON workflow_status(status);
