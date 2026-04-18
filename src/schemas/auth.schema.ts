import { z } from "zod";

export const RegisterSchema = z.object({
  displayName: z.string().min(1).max(50),
});

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  defaultHouseholdId: z.string().nullable().optional(),
});
