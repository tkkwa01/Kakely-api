import type { HouseholdDoc } from "./firestore.types.js";

export type AuthVariables = {
  userId: string;
  userEmail: string;
};

export type HouseholdVariables = AuthVariables & {
  householdId: string;
  household: HouseholdDoc & { id: string };
};
