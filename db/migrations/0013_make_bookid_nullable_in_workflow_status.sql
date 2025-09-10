-- Make bookId nullable in workflow_status table
ALTER TABLE workflow_status 
  ALTER COLUMN "bookId" DROP NOT NULL;
