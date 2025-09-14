import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

async function checkDbConnection() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING;
  
  if (!connectionString) {
    console.error('❌ Error: POSTGRES_URL_NON_POOLING is not set in environment variables');
    process.exit(1);
  }

  console.log('🔌 Testing database connection...');
  
  // Mask password in logs
  const maskedConnection = connectionString.replace(
    /:\/\/([^:]+):([^@]+)@/, 
    (_, user, pass) => `://${user}:${'*'.repeat(pass.length)}@`
  );
  
  console.log(`📡 Connection string: ${maskedConnection}`);
  
  const client = postgres(connectionString, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
  });

  try {
    // Test connection
    const result = await client`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    console.log('Test query result:', result);
    
    // Check if required tables exist
    console.log('\n🔍 Checking required tables...');
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('user_balances', 'credit_transactions')
    `;
    
    console.log('Found tables:', tables);
    
    if (tables.length < 2) {
      console.warn('⚠️  Warning: Not all required tables were found');
    } else {
      console.log('✅ All required tables exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDbConnection();
