import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  aiCreditBalances,
  aiCreditTransactions,
  notifications,
  profiles,
  subscriptions,
} from './schema.ts';

const ADMIN_EMAILS = new Set(
  [process.env.ADMIN_EMAIL, 'laghribredouane@gmail.com']
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => v.trim().toLowerCase())
);

export async function getOrCreateProfile(uid: string, email: string, fullName?: string, avatarUrl?: string) {
  try {
    const normalizedEmail = (email || `${uid}@ebookstudio.local`).toLowerCase();
    const isAdminEmail = ADMIN_EMAILS.has(normalizedEmail);

    const existing = await db.select().from(profiles).where(eq(profiles.uid, uid)).limit(1);
    if (existing.length > 0) {
      const current = existing[0];
      if (isAdminEmail && current.role !== 'admin') {
        const updated = await db
          .update(profiles)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(profiles.id, current.id))
          .returning();
        return updated[0];
      }
      return current;
    }

    const inserted = await db
      .insert(profiles)
      .values({
        uid,
        email: normalizedEmail,
        fullName: fullName || normalizedEmail.split('@')[0] || 'Author',
        avatarUrl: avatarUrl || null,
        role: isAdminEmail ? 'admin' : 'user',
        plan: isAdminEmail ? 'business' : 'free',
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email: normalizedEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    const profile = inserted[0];
    const startingCredits = profile.plan === 'business' ? 2000 : 120;

    await db
      .insert(aiCreditBalances)
      .values({
        profileId: profile.id,
        balance: startingCredits,
        monthlyAllowance: startingCredits,
      })
      .onConflictDoNothing();

    await db
      .insert(aiCreditTransactions)
      .values({
        profileId: profile.id,
        amount: startingCredits,
        type: 'grant',
        action: 'welcome_bonus',
        description: 'Crédits de bienvenue EBOOK STUDIO AI',
        idempotencyKey: `welcome_${profile.id}`,
      })
      .onConflictDoNothing();

    await db
      .insert(subscriptions)
      .values({
        profileId: profile.id,
        plan: profile.plan,
        status: 'active',
        billingCycle: 'monthly',
        provider: 'default',
      })
      .onConflictDoNothing();

    await db.insert(notifications).values({
      profileId: profile.id,
      title: 'Bienvenue sur EBOOK STUDIO AI',
      message: `Votre espace de création est prêt avec ${startingCredits} crédits IA.`,
    });

    return profile;
  } catch (error) {
    console.error('Database query failed in getOrCreateProfile:', error);
    throw new Error('Impossible de synchroniser le profil utilisateur.', { cause: error });
  }
}

export async function getProfileByUid(uid: string) {
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getProfileByUid:', error);
    throw new Error('Impossible de lire le profil utilisateur.', { cause: error });
  }
}
