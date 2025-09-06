import { db } from '@/db/drizzle';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('Starting UUID migration...');
    
    // Enable UUID extension if not already enabled
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Add new UUID columns
    await db.execute(sql`
      ALTER TABLE books ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
      ALTER TABLE chapters ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT uuid_generate_v4();
      ALTER TABLE chapters ADD COLUMN IF NOT EXISTS new_book_id UUID;
      ALTER TABLE chapters ADD COLUMN IF NOT EXISTS new_parent_chapter_id UUID;
    `);

    // Update new columns with UUIDs
    await db.execute(sql`UPDATE books SET new_id = uuid_generate_v4() WHERE new_id IS NULL`);
    await db.execute(sql`UPDATE chapters SET new_id = uuid_generate_v4() WHERE new_id IS NULL`);

    // Update foreign key references
    await db.execute(sql`
      UPDATE chapters c 
      SET new_book_id = b.new_id 
      FROM books b 
      WHERE c.book_id::text = b.id::text AND c.new_book_id IS NULL;
    `);

    // Update self-referential parent chapter IDs
    await db.execute(sql`
      UPDATE chapters c1
      SET new_parent_chapter_id = c2.new_id
      FROM chapters c2
      WHERE c1.parent_chapter_id::text = c2.id::text 
      AND c1.new_parent_chapter_id IS NULL;
    `);

    // Drop constraints
    await db.execute(sql`
      ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_book_id_fkey;
      ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_parent_chapter_id_fkey;
    `);

    // Drop old columns and rename new ones
    await db.execute(sql`
      ALTER TABLE chapters DROP COLUMN IF EXISTS book_id;
      ALTER TABLE chapters DROP COLUMN IF EXISTS parent_chapter_id;
      ALTER TABLE books DROP COLUMN IF EXISTS id CASCADE;
      
      ALTER TABLE books RENAME COLUMN new_id TO id;
      ALTER TABLE chapters RENAME COLUMN new_id TO id;
      ALTER TABLE chapters RENAME COLUMN new_book_id TO book_id;
      ALTER TABLE chapters RENAME COLUMN new_parent_chapter_id TO parent_chapter_id;
      
      ALTER TABLE books ADD PRIMARY KEY (id);
      ALTER TABLE chapters ADD PRIMARY KEY (id);
      
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
    `);

    console.log('UUID migration completed successfully!');
  } catch (error) {
    console.error('Error during UUID migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
