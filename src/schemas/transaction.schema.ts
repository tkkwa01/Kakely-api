import { z } from "zod";

export const CreateTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  categoryId: z.string().min(1),
  memo: z.string().max(200).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial();

export const TransactionQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  startAfter: z.string().optional(),
});
