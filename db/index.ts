// Re-export all schema tables and types
export * from './schema';

// Explicitly export tables with their correct names
export {
  // Tables
  books,
  chapters,
  user,
  session,
  account,
  verification,
  subscription,
  subscriptionPlans,
  userProfiles,
  userPreferences,
  media,
  // Types
  type Book,
  type NewBook,
  type Chapter,
  type NewChapter,
  type User,
  type Session,
  type Account,
  type Verification,
  type Subscription,
  type SubscriptionPlan,
  type UserProfile,
  type UserPreference,
  type Media
} from './schema';
