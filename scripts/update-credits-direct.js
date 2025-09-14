const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateCredits() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Get all users
    const usersRes = await client.query('SELECT id, email FROM auth.users');
    console.log(`Found ${usersRes.rows.length} users`);
    
    // For each user, ensure they have a balance of 1000 credits
    for (const user of usersRes.rows) {
      // Check if user has a balance record
      const balanceRes = await client.query(
        'SELECT balance FROM credit_balances WHERE user_id = $1',
        [user.id]
      );
      
      if (balanceRes.rows.length > 0) {
        // Update existing balance
        await client.query(
          'UPDATE credit_balances SET balance = 1000, updated_at = NOW() WHERE user_id = $1',
          [user.id]
        );
        console.log(`Updated ${user.email} (${user.id}) to 1000 credits`);
      } else {
        // Insert new balance
        await client.query(
          'INSERT INTO credit_balances (user_id, balance, created_at, updated_at) VALUES ($1, 1000, NOW(), NOW())',
          [user.id]
        );
        console.log(`Created balance for ${user.email} (${user.id}) with 1000 credits`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\nAll user credits have been updated to 1000');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating credits:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateCredits();
