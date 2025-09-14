import { config } from 'dotenv';
import postgres from 'postgres';

interface DatabaseTable {
  table_name: string;
}

// Load environment variables
config({ path: '.env' });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

// Use the connection string from environment variables
const connectionString = process.env.POSTGRES_URL_NON_POOLING;

async function testConnection() {
  try {
    console.log('Connecting to database with connection string:', 
      connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    const client = postgres(connectionString, {
      connection: {
        connectionTimeoutMillis: 10000, // 10 seconds
        query_timeout: 10000, // 10 seconds
        statement_timeout: 10000, // 10 seconds
      },
      ssl: 'require',
      max: 1, // Use a single connection for testing
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
    
    // Test a simple query
    console.log('Running test query...');
    const result = await client`SELECT 1 as test`;
    console.log('Test query result:', result);

    // Test credit transactions table
    console.log('Checking credit_transactions table...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Available tables:', tables);

    if (tables.some((t: DatabaseTable) => t.table_name === 'credit_transactions')) {
      console.log('credit_transactions table exists');
      const count = await client`SELECT COUNT(*) as count FROM credit_transactions`;
      console.log('Number of transactions:', count[0]?.count);
    } else {
      console.log('credit_transactions table does not exist');
    }

    console.log('Database connection test completed successfully!');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Connection error:', errorMessage);
    process.exit(1);
  }
}

testConnection();
