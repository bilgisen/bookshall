-- Add foreign key constraint for parentChapterId
ALTER TABLE chapters 
ADD CONSTRAINT fk_chapter_parent 
FOREIGN KEY (parent_chapter_id) 
REFERENCES chapters(id) 
ON DELETE CASCADE;
