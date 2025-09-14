import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

async function verifyCreditTables() {
  console.log('🔍 Verifying credit system tables...\n');

  try {
    // 1. Check if credit_transactions table exists and get its structure
    console.log('1. Checking credit_transactions table...');
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'credit_transactions');

    if (transactionsError || !transactionsData?.length) {
      console.error('❌ credit_transactions table does not exist');
      if (transactionsError) console.error('Error:', transactionsError);
    } else {
      console.log('✅ credit_transactions table exists');
      
      // Get columns
      const { data: transactionsCols, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'credit_transactions');
      
      if (colError) {
        console.error('❌ Error getting columns:', colError);
      } else {
        console.log('📋 credit_transactions columns:');
        console.table(transactionsCols);
      }
    }

    // 2. Check if user_balances table exists and get its structure
    console.log('\n2. Checking user_balances table...');
    const { data: balancesData, error: balancesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_balances');

    if (balancesError || !balancesData?.length) {
      console.error('❌ user_balances table does not exist');
      if (balancesError) console.error('Error:', balancesError);
    } else {
      console.log('✅ user_balances table exists');
      
      // Get columns
      const { data: balancesCols, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'user_balances');
      
      if (colError) {
        console.error('❌ Error getting columns:', colError);
      } else {
        console.log('📋 user_balances columns:');
        console.table(balancesCols);
      }
    }

    // 3. Check indexes
    console.log('\n3. Checking indexes...');
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('*')
      .or('tablename.eq.credit_transactions,tablename.eq.user_balances');

    if (indexError) {
      console.error('❌ Error checking indexes:', indexError);
    } else if (indexes?.length) {
      console.log('🔑 Found indexes:');
      console.table(indexes.map(idx => ({
        table: idx.tablename,
        name: idx.indexname,
        columns: idx.indexdef.match(/\(([^)]+)\)/)?.[1] || 'unknown'
      })));
    } else {
      console.log('ℹ️ No indexes found on credit system tables');
    }

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyCreditTables();
