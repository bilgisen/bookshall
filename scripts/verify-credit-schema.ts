import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCreditSchema() {
  console.log('🔍 Verifying credit system database schema...\n');

  try {
    // 1. Check if credit_transactions table exists
    console.log('1. Checking credit_transactions table...');
    const { data: transactionsTable, error: transactionsError } = await supabase
      .rpc('check_table_exists', { table_name: 'credit_transactions' });
    
    if (transactionsError || !transactionsTable) {
      console.error('❌ credit_transactions table does not exist or is not accessible');
      if (transactionsError) console.error('Error:', transactionsError);
      return;
    }
    console.log('✅ credit_transactions table exists');

    // 2. Check if user_balances table exists
    console.log('\n2. Checking user_balances table...');
    const { data: balancesTable, error: balancesError } = await supabase
      .rpc('check_table_exists', { table_name: 'user_balances' });
    
    if (balancesError || !balancesTable) {
      console.error('❌ user_balances table does not exist or is not accessible');
      if (balancesError) console.error('Error:', balancesError);
      return;
    }
    console.log('✅ user_balances table exists');

    // 3. Check credit_transactions structure
    console.log('\n3. Verifying credit_transactions structure...');
    const { data: transactionsColumns, error: transactionsColError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'credit_transactions');

    if (transactionsColError) {
      console.error('❌ Error checking credit_transactions structure:', transactionsColError);
      return;
    }

    const requiredColumns = [
      { name: 'id', type: 'uuid' },
      { name: 'user_id', type: 'text' },
      { name: 'type', type: 'USER-DEFINED' }, // enum type
      { name: 'amount', type: 'integer' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp with time zone' }
    ];

    const missingColumns = requiredColumns.filter(rc => 
      !transactionsColumns?.some((col: any) => col.column_name === rc.name && 
        (col.data_type === rc.type || 
         (rc.type === 'USER-DEFINED' && col.udt_name === 'transaction_type')))
    );

    if (missingColumns.length > 0) {
      console.error('❌ Missing or incorrect columns in credit_transactions:');
      missingColumns.forEach(col => console.error(`  - ${col.name} (${col.type})`));
    } else {
      console.log('✅ credit_transactions structure is correct');
    }

    // 4. Check user_balances structure
    console.log('\n4. Verifying user_balances structure...');
    const { data: balancesColumns, error: balancesColError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'user_balances');

    if (balancesColError) {
      console.error('❌ Error checking user_balances structure:', balancesColError);
      return;
    }

    const requiredBalancesColumns = [
      { name: 'user_id', type: 'text' },
      { name: 'balance', type: 'integer' },
      { name: 'created_at', type: 'timestamp with time zone' },
      { name: 'updated_at', type: 'timestamp with time zone' }
    ];

    const missingBalancesColumns = requiredBalancesColumns.filter(rbc => 
      !balancesColumns?.some((col: any) => col.column_name === rbc.name && col.data_type === rbc.type)
    );

    if (missingBalancesColumns.length > 0) {
      console.error('❌ Missing or incorrect columns in user_balances:');
      missingBalancesColumns.forEach(col => console.error(`  - ${col.name} (${col.type})`));
    } else {
      console.log('✅ user_balances structure is correct');
    }

    // 5. Check indexes
    console.log('\n5. Verifying indexes...');
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('*')
      .or('indexname.ilike.%credit_transactions%,indexname.ilike.%user_balances%');

    if (indexError) {
      console.error('❌ Error checking indexes:', indexError);
      return;
    }

    const requiredIndexes = [
      'credit_transactions_user_id_idx',
      'credit_transactions_created_at_idx',
      'user_balances_user_id_idx'
    ];

    const existingIndexes = indexes?.map((idx: any) => idx.indexname) || [];
    const missingIndexes = requiredIndexes.filter(ri => !existingIndexes.includes(ri));

    if (missingIndexes.length > 0) {
      console.error('❌ Missing indexes:');
      missingIndexes.forEach(idx => console.error(`  - ${idx}`));
    } else {
      console.log('✅ All required indexes exist');
    }

    // 6. Check foreign keys
    console.log('\n6. Verifying foreign keys...');
    const { data: fks, error: fkError } = await supabase
      .rpc('get_foreign_keys');

    if (fkError) {
      console.error('❌ Error checking foreign keys:', fkError);
      return;
    }

    const requiredFKs = [
      { from: 'credit_transactions', to: 'user', column: 'user_id' },
      { from: 'user_balances', to: 'user', column: 'user_id' }
    ];

    const missingFKs = requiredFKs.filter(rfk => 
      !fks?.some((fk: any) => 
        fk.table_name === rfk.from && 
        fk.foreign_table_name === rfk.to &&
        fk.column_name === rfk.column
      )
    );

    if (missingFKs.length > 0) {
      console.error('❌ Missing foreign keys:');
      missingFKs.forEach(fk => console.error(`  - ${fk.from}.${fk.column} → ${fk.to}.id`));
    } else {
      console.log('✅ All required foreign keys exist');
    }

    console.log('\n✅ Credit system schema verification complete!');

  } catch (error) {
    console.error('❌ Error during schema verification:', error);
  }
}

// Create the required PostgreSQL functions if they don't exist
async function setupDatabaseFunctions() {
  console.log('\n🛠 Setting up database functions...');
  
  try {
    // Create check_table_exists function
    await supabase.rpc('create_or_replace_function', {
      function_name: 'check_table_exists',
      function_definition: `
      CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
      RETURNS boolean AS $$
      DECLARE
          table_exists boolean;
      BEGIN
          SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = $1
          ) INTO table_exists;
          RETURN table_exists;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    // Create get_foreign_keys function
    await supabase.rpc('create_or_replace_function', {
      function_name: 'get_foreign_keys',
      function_definition: `
      CREATE OR REPLACE FUNCTION get_foreign_keys()
      RETURNS TABLE (
          table_name text,
          column_name text,
          foreign_table_name text,
          foreign_column_name text
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT
              tc.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
          FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
          WHERE 
              tc.constraint_type = 'FOREIGN KEY' 
              AND (tc.table_name = 'credit_transactions' OR tc.table_name = 'user_balances');
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    console.log('✅ Database functions created successfully');
  } catch (error) {
    console.error('❌ Error setting up database functions:', error);
    process.exit(1);
  }
}

// Run the verification
async function main() {
  await setupDatabaseFunctions();
  await verifyCreditSchema();
  process.exit(0);
}

main();
