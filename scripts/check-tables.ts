import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

async function checkTables() {
  const client = postgres(process.env.POSTGRES_URL_NON_POOLING, {
    ssl: 'require',
    max: 1,
  });

  try {
    // Check if credit_transactions table exists
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'credit_transactions';
    `;

    if (tables.length === 0) {
      console.log('credit_transactions table does not exist');
      return;
    }

    console.log('credit_transactions table exists. Checking structure...');

    // Get table structure
    const columns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'credit_transactions';
    `;

    console.log('Table structure:');
    console.table(columns);

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await client.end();
  }
}

checkTables();
