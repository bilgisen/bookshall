import { db } from '../lib/db';
import { creditTransactions } from '../db/schema/creditTransactions';
import { user } from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { CreditService } from '../lib/services/credit';

async function awardWelcomeBonuses() {
  console.log('Starting welcome bonus distribution...');
  
  try {
    // Find users who don't have a WELCOME_BONUS transaction
    const usersWithoutBonus = await db
      .select({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      })
      .from(user)
      .leftJoin(
        creditTransactions,
        and(
          eq(creditTransactions.userId, user.id),
          eq(creditTransactions.reason, 'WELCOME_BONUS')
        )
      )
      .where(isNull(creditTransactions.id));

    console.log(`Found ${usersWithoutBonus.length} users without welcome bonus`);

    let successCount = 0;
    const failedUsers: { id: string; error: unknown }[] = [];

    // Process each user
    for (const user of usersWithoutBonus) {
      try {
        await db.transaction(async (tx) => {
          // Check again in transaction to prevent race conditions
          const hasBonus = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(creditTransactions)
            .where(
              and(
                eq(creditTransactions.userId, user.id),
                eq(creditTransactions.reason, 'WELCOME_BONUS')
              )
            )
            .then((res) => res[0].count > 0);

          if (!hasBonus) {
            await CreditService.earnCredits(
              user.id,
              1000,
              'WELCOME_BONUS',
              { type: 'welcome_bonus', awardedAt: new Date().toISOString() }
            );
            successCount++;
            console.log(`✅ Awarded welcome bonus to ${user.email || user.id}`);
          }
        });
      } catch (error) {
        console.error(`❌ Failed to award welcome bonus to ${user.email || user.id}:`, error);
        failedUsers.push({ id: user.id, error });
      }
    }

    // Print summary
    console.log('\n🎉 Welcome bonus distribution complete!');
    console.log(`✅ Successfully awarded to: ${successCount} users`);
    
    if (failedUsers.length > 0) {
      console.log(`❌ Failed to award to: ${failedUsers.length} users`);
      console.log('Failed user IDs:', failedUsers.map(u => u.id).join(', '));
    }

  } catch (error) {
    console.error('Error in welcome bonus distribution:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
awardWelcomeBonuses();
