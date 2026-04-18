import { z } from "zod";

export const CreateHouseholdSchema = z.object({
  name: z.string().min(1).max(50),
});

export const UpdateHouseholdSchema = z.object({
  name: z.string().min(1).max(50),
});

export const JoinHouseholdSchema = z.object({
  inviteCode: z.string().min(1),
});
