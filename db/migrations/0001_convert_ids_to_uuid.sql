-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a new UUID column for books
ALTER TABLE books ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();

-- Create a new UUID column for chapters
ALTER TABLE chapters ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
ALTER TABLE chapters ADD COLUMN new_book_id UUID;
ALTER TABLE chapters ADD COLUMN new_parent_chapter_id UUID;

-- Update the new columns with UUIDs
UPDATE books SET new_id = uuid_generate_v4();
UPDATE chapters SET new_id = uuid_generate_v4();

-- Update foreign key references
UPDATE chapters c 
SET new_book_id = b.new_id 
FROM books b 
WHERE c.book_id = b.id;

-- Update self-referential parent chapter IDs
UPDATE chapters c1
SET new_parent_chapter_id = c2.new_id
FROM chapters c2
WHERE c1.parent_chapter_id = c2.id;

-- Drop constraints
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_book_id_fkey;
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_parent_chapter_id_fkey;

-- Drop old columns
ALTER TABLE chapters DROP COLUMN book_id;
ALTER TABLE chapters DROP COLUMN parent_chapter_id;
ALTER TABLE books DROP COLUMN id CASCADE;

-- Rename new columns
ALTER TABLE books RENAME COLUMN new_id TO id;
ALTER TABLE chapters RENAME COLUMN new_id TO id;
ALTER TABLE chapters RENAME COLUMN new_book_id TO book_id;
ALTER TABLE chapters RENAME COLUMN new_parent_chapter_id TO parent_chapter_id;

-- Add primary keys and constraints
ALTER TABLE books ADD PRIMARY KEY (id);
ALTER TABLE chapters ADD PRIMARY KEY (id);

-- Add foreign key constraints
ALTER TABLE chapters 
  ADD CONSTRAINT chapters_book_id_fkey 
  FOREIGN KEY (book_id) 
  REFERENCES books(id) 
  ON DELETE CASCADE;

ALTER TABLE chapters 
  ADD CONSTRAINT chapters_parent_chapter_id_fkey 
  FOREIGN KEY (parent_chapter_id) 
  REFERENCES chapters(id) 
  ON DELETE SET NULL;
