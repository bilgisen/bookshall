import { db } from '@/db/drizzle';
import { subscription } from '@/db/schema';
import { CreditService } from '@/lib/services/credit/credit.service';

/**
 * Kullanıcı kaydı sonrası otomatik işlemler:
 * - Free subscription oluştur
 * - Welcome bonus (1000 credit) ekle
 */
export async function handleUserSignup(userId: string) {
  // Free subscription ekle
  await db.insert(subscription).values({
    id: `${userId}-free`, // Benzersiz bir id
    userId,
    productId: process.env.NEXT_PUBLIC_STARTER_TIER || 'a8d37622-a244-4ccf-8c95-8dda4f5c26c1',
    status: 'active',
    amount: 0,
    currency: 'credits',
    recurringInterval: 'none',
    createdAt: new Date(),
    modifiedAt: new Date(),
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(), // Free plan için süre yok
    cancelAtPeriodEnd: false,
    canceledAt: null,
    startedAt: new Date(),
    endsAt: null,
    endedAt: null,
    customerId: userId, // Free plan için userId kullan
    discountId: null,
    checkoutId: 'free',
    customerCancellationReason: null,
    customerCancellationComment: null,
    metadata: null,
    customFieldData: null,
  });

  // Welcome bonus ekle
  await CreditService.earnCredits(userId, 1000, 'Welcome bonus', { source: 'signup' });
}
