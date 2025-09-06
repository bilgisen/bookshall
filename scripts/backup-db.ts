import { db } from '@/db/drizzle';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase() {
  try {
    console.log('Starting database backup...');
    
    // Get current timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'db', 'backups');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Execute backup using pg_dump
    const { execSync } = require('child_process');
    execSync(`pg_dump ${databaseUrl} > ${backupFile}`);
    
    console.log(`Backup created successfully at: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('Error during database backup:', error);
    throw error;
  }
}

// Run the backup
backupDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
