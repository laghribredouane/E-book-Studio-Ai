import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { aiCreditBalances, aiCreditTransactions, platformSettings } from '../db/schema.ts';

export const DEFAULT_AI_COSTS: Record<string, number> = {
  outline: 5,
  chapter_draft: 10,
  generate_paragraph: 3,
  continue: 3,
  rewrite: 3,
  expand: 4,
  summarize: 2,
  fix_grammar: 2,
  improve_style: 3,
  translate: 4,
  simplify: 2,
  change_tone: 3,
  proofread: 8,
  generate_image: 15,
  writer_chat: 1,
  from_image: 10,
};

export async function getAiCosts(): Promise<Record<string, number>> {
  try {
    const row = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, 'ai_costs'))
      .limit(1);
    if (row.length > 0 && row[0].value) {
      return { ...DEFAULT_AI_COSTS, ...(row[0].value as Record<string, number>) };
    }
  } catch (error) {
    console.error('Failed to read ai_costs setting:', error);
  }
  return DEFAULT_AI_COSTS;
}

export async function getCreditBalance(profileId: string): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(aiCreditBalances)
      .where(eq(aiCreditBalances.profileId, profileId))
      .limit(1);
    return rows[0]?.balance ?? 0;
  } catch (error) {
    console.error('Failed to fetch credit balance:', error);
    throw new Error('Impossible de consulter le solde de crédits.', { cause: error });
  }
}

export async function chargeCreditsAtomic(params: {
  profileId: string;
  action: string;
  description: string;
  idempotencyKey?: string;
}): Promise<{ charged: number; newBalance: number; duplicate?: boolean }> {
  const costs = await getAiCosts();
  const cost = Math.max(0, Number(costs[params.action] ?? 5));

  if (params.idempotencyKey) {
    const existingTx = await db
      .select()
      .from(aiCreditTransactions)
      .where(eq(aiCreditTransactions.idempotencyKey, params.idempotencyKey))
      .limit(1);
    if (existingTx.length > 0) {
      const currentBalance = await getCreditBalance(params.profileId);
      return { charged: 0, newBalance: currentBalance, duplicate: true };
    }
  }

  return await db.transaction(async (tx) => {
    if (cost > 0) {
      const updated = await tx
        .update(aiCreditBalances)
        .set({
          balance: sql`${aiCreditBalances.balance} - ${cost}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(aiCreditBalances.profileId, params.profileId),
            gte(aiCreditBalances.balance, cost)
          )
        )
        .returning();

      if (updated.length === 0) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      await tx.insert(aiCreditTransactions).values({
        profileId: params.profileId,
        amount: -cost,
        type: 'usage',
        action: params.action,
        description: params.description,
        idempotencyKey: params.idempotencyKey || null,
      });

      return { charged: cost, newBalance: updated[0].balance };
    }

    const current = await tx
      .select()
      .from(aiCreditBalances)
      .where(eq(aiCreditBalances.profileId, params.profileId))
      .limit(1);

    return { charged: 0, newBalance: current[0]?.balance ?? 0 };
  });
}

export async function refundCreditsAtomic(params: {
  profileId: string;
  amount: number;
  action: string;
  description: string;
}) {
  if (params.amount <= 0) return;
  await db.transaction(async (tx) => {
    await tx
      .update(aiCreditBalances)
      .set({
        balance: sql`${aiCreditBalances.balance} + ${params.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(aiCreditBalances.profileId, params.profileId));

    await tx.insert(aiCreditTransactions).values({
      profileId: params.profileId,
      amount: params.amount,
      type: 'refund',
      action: params.action,
      description: params.description,
    });
  });
}
