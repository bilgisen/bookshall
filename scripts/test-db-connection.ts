import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Use the unpooled connection string for direct connections
const connectionString = 'postgresql://neondb_owner:npg_CcS1MwP7xFoE@ep-snowy-bar-agtaujj1.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

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
    
    const db = drizzle(client);

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

    if (tables.some((t: any) => t.table_name === 'credit_transactions')) {
      console.log('credit_transactions table exists');
      const count = await client`SELECT COUNT(*) as count FROM credit_transactions`;
      console.log('Number of transactions:', count[0]?.count);
    } else {
      console.log('credit_transactions table does not exist');
    }

    console.log('Database connection test completed successfully!');
  } catch (error) {
    console.error('Database connection test failed:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();
