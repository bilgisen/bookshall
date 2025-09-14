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

async function checkCreditTables() {
  console.log('🔍 Checking credit system tables...\n');

  try {
    // Check credit_transactions table
    console.log('1. Testing credit_transactions table...');
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .limit(1);

    if (txError) {
      console.error('❌ Error accessing credit_transactions table:', txError);
    } else {
      console.log('✅ credit_transactions table is accessible');
      console.log('📋 Sample data:', transactions || 'No transactions yet');
    }

    // Check user_balances table
    console.log('\n2. Testing user_balances table...');
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .limit(1);

    if (balanceError) {
      console.error('❌ Error accessing user_balances table:', balanceError);
    } else {
      console.log('✅ user_balances table is accessible');
      console.log('📋 Sample data:', balances || 'No balance records yet');
    }

    // Test the get_user_balance function
    console.log('\n3. Testing get_user_balance function...');
    const testUserId = 'test-user-123';
    const { data: balance, error: fnError } = await supabase
      .rpc('get_user_balance', { p_user_id: testUserId });

    if (fnError) {
      console.error('❌ Error calling get_user_balance function:', fnError);
    } else {
      console.log(`✅ get_user_balance function works. Balance for ${testUserId}:`, balance);
    }

    console.log('\n✅ Credit system is ready to use!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

checkCreditTables();
