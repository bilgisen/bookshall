import { db } from '@/lib/db';
import { userBalances } from '@/db/schema/creditTransactions';
import { eq } from 'drizzle-orm';

async function checkAndUpdateCredits() {
  try {
    console.log('Fetching all users and their balances...');
    
    // Get all users with their current balances
    const allUsers = await db.query.authUsers.findMany({
      with: {
        balance: true
      }
    });

    console.log(`Found ${allUsers.length} users`);
    
    // Check and update balances
    let updatedCount = 0;
    
    for (const user of allUsers) {
      const currentBalance = user.balance?.balance ?? 0;
      
      if (currentBalance < 1000) {
        console.log(`Updating user ${user.email} (${user.id}) from ${currentBalance} to 1000 credits`);
        
        await db
          .insert(userBalances)
          .values({
            userId: user.id,
            balance: 1000,
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: userBalances.userId,
            set: { 
              balance: 1000,
              updatedAt: new Date()
            }
          });
          
        updatedCount++;
      } else {
        console.log(`User ${user.email} already has ${currentBalance} credits (no update needed)`);
      }
    }
    
    console.log(`\nUpdate complete. Updated ${updatedCount} users to have 1000 credits.`);
    
  } catch (error) {
    console.error('Error updating user credits:', error);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

checkAndUpdateCredits();
