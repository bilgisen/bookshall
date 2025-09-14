const { Pool } = require('pg');
require('dotenv').config();

async function verifyBalances() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();
  
  try {
    // Get all users with their balances
    const result = await client.query(`
      SELECT u.id, u.email, ub.balance, ub.updated_at
      FROM "user" u
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      ORDER BY u.email;
    `);

    console.log('User Balances:');
    console.table(result.rows);
    
    // Check for users with 0 or null balance
    const zeroBalanceUsers = result.rows.filter(row => !row.balance || row.balance === 0);
    if (zeroBalanceUsers.length > 0) {
      console.log('\nUsers with 0 or null balance:');
      console.table(zeroBalanceUsers);
      
      // Update users with 0 or null balance to 1000
      console.log('\nUpdating zero/null balances to 1000...');
      const updateResult = await client.query(`
        WITH users_to_update AS (
          SELECT u.id 
          FROM "user" u
          LEFT JOIN user_balances ub ON u.id = ub.user_id
          WHERE ub.balance IS NULL OR ub.balance = 0
        )
        INSERT INTO user_balances (user_id, balance, updated_at)
        SELECT id, 1000, NOW()
        FROM users_to_update
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          balance = 1000,
          updated_at = NOW()
        RETURNING user_id, balance;
      `);
      
      console.log(`Updated ${updateResult.rowCount} users to have 1000 credits`);
    } else {
      console.log('\nAll users have a non-zero balance.');
    }
    
  } catch (error) {
    console.error('Error verifying balances:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyBalances();
